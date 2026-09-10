from collections.abc import AsyncIterator
from logging import getLogger
from typing import Optional
from uuid import uuid4

import aiohttp
from apps.auth import get_user
from eve.render import send_response
from quart import Response, current_app, request
from quart.json import dumps, loads
from superdesk import get_resource_service
from superdesk.auth.decorator import blueprint_auth
from superdesk.errors import SuperdeskApiError
from superdesk.eve_async.service import AsyncBaseService
from superdesk.flask import Blueprint
from superdesk.resource import Resource
from superdesk.utils import get_cors_headers
from superdesk.utc import utcnow
from quart_babel import gettext as _

logger = getLogger(__name__)

bp = Blueprint("research_tool", __name__, url_prefix="/api")

CHAT_TITLE_MAX_LENGTH = 80

CITATION_SCHEMA = {
    "citation_id": {"type": "string"},
    "uri": {"type": "string"},
    "slugline": {"type": "string"},
    "headline": {"type": "string"},
    "description": {"type": "string"},
    "date_published": {"type": "string"},
    "language": {"type": "string"},
    "source": {"type": "string"},
    "type": {"type": "string"},
}

MESSAGE_SCHEMA = {
    "type": {"type": "string", "allowed": ["QUERY", "RESPONSE"], "required": True},
    "value": {"type": "string", "required": True},
    "citations": {
        "type": "list",
        "schema": {"type": "dict", "schema": CITATION_SCHEMA},
    },
    "created": {"type": "datetime", "required": True},
}

CHAT_SCHEMA = {
    "chat_id": {"type": "string", "required": True, "unique": True},
    "chat_title": {"type": "string", "required": True},
    "user_email": {"type": "string", "readonly": True},
    "messages": {
        "type": "list",
        "schema": {"type": "dict", "schema": MESSAGE_SCHEMA},
    },
}


@bp.route("/research_tool/stream", methods=["GET", "OPTIONS"])
@blueprint_auth()
async def research_tool_stream():
    user_email = _current_user_email()
    service = get_resource_service("research_tool")
    chat_id = (request.args.get("chat_id") or "").strip() or None
    if chat_id:
        existing = await service.find_one_async(req=None, chat_id=chat_id)
        if existing:
            _assert_chat_owner(existing, user_email)

    response = Response(
        _research_tool_generator(
            service,
            {
                "query": request.args.get("q", ""),
                "chat_id": chat_id,
                "user_email": user_email,
                "config": current_app.config,
                "app": current_app._get_current_object(),
            },
        ),
        mimetype="text/event-stream",
    )
    response.headers.update([*get_cors_headers(["GET"]), ("Cache-Control", "no-cache")])

    return response


@bp.route("/research_tool/chat", methods=["GET", "OPTIONS"])
@blueprint_auth()
async def research_tool_chat():
    user_email = _current_user_email()
    service = get_resource_service("research_tool")
    items = await service.list_user_chat_summaries(user_email)
    response_data = {"_items": items, "_meta": {"total": len(items)}}
    return await send_response(None, (response_data, utcnow(), None, 200))


@bp.route("/research_tool/chat/<chat_id>", methods=["GET", "OPTIONS"])
@blueprint_auth()
async def research_tool_chat_detail(chat_id: str):
    service = get_resource_service("research_tool")
    chat = await service.get_user_chat_detail(chat_id)
    if not chat:
        raise SuperdeskApiError.notFoundError(_("Chat not found."))
    return await send_response(None, (chat, utcnow(), None, 200))


def _parse_sse_block(block: str) -> Optional[dict]:
    """Parse one complete SSE event block into its JSON data payload."""
    data_parts: list[str] = []
    for line in block.split("\n"):
        if not line or line.startswith(":"):
            continue
        if line.startswith("data:"):
            data_parts.append(line[5:].lstrip())

    if not data_parts:
        return None

    try:
        return loads("\n".join(data_parts))
    except (ValueError, TypeError):
        return None


async def _research_tool_generator(service, lookup):
    """
    Proxy SSE passthrough for Agents/Runs events:
    response.created, response.starting, response.output_text.delta,
    response.output_item.added, response.output_content.full,
    response.output_item.done, response.done

    Plus CP middleware events: chat (early), response.citation (from cited_documents).
    """
    state = {
        "answer_parts": [],
        "citations": [],
        "chat_id": (lookup.get("chat_id") or "").strip(),
        "query": (lookup.get("query") or "").strip(),
        "user_email": lookup.get("user_email"),
        "app": lookup.get("app"),
        "sse_buffer": "",
    }

    async for item in service.stream_proxy_async(lookup=lookup):
        # Upstream SSE uses CRLF; normalize so event boundaries are "\n\n".
        state["sse_buffer"] += item.replace("\r\n", "\n")
        while "\n\n" in state["sse_buffer"]:
            block, state["sse_buffer"] = state["sse_buffer"].split("\n\n", 1)
            block = block.strip()
            if not block:
                continue
            citation_events = await _process_sse_block(service, state, block)
            for citation_event in citation_events:
                yield citation_event
        yield item

    remainder = state["sse_buffer"].strip()
    if remainder:
        citation_events = await _process_sse_block(service, state, remainder)
        for citation_event in citation_events:
            yield citation_event


async def _save_exchange(
    service,
    app,
    *,
    chat_id: str,
    user_email: str,
    query: str,
    answer: str,
    citations: list,
) -> bool:
    """Persist a query/response exchange. Returns False on failure (already logged)."""
    try:
        async with app.app_context():
            await service.append_exchange(
                chat_id=chat_id,
                user_email=user_email,
                query=query,
                answer=answer,
                citations=citations,
            )
        return True
    except Exception:
        logger.exception(
            "Failed to save research tool exchange chat_id=%s",
            chat_id,
        )
        return False


async def _process_sse_block(service, state: dict, block: str) -> list[str]:
    """Update stream state from one SSE block; return citation events to emit."""
    events: list[str] = []
    data = _parse_sse_block(block)
    if not data:
        return events

    if data.get("chat_id") and not data.get("type"):
        state["chat_id"] = data["chat_id"]

    event_type = data.get("type")

    if event_type == "response.output_text.delta":
        delta = data.get("response", {}).get("delta", "") or ""
        state["answer_parts"].append(delta)

    elif event_type == "response.output_content.full":
        full = data.get("response", {}).get("full", {})
        if full.get("type") == "cited_documents":
            citations = [
                _normalize_citation(c) for c in full.get("documents", [])
            ]
            state["citations"] = citations
            for citation_data in citations:
                events.append(
                    f"event: response.citation\ndata: {dumps(citation_data)}\n\n"
                )

    elif event_type == "response.done":
        chat_id = state["chat_id"]
        query = state["query"]
        answer_parts = state["answer_parts"]
        app = state["app"]
        user_email = state["user_email"]
        if chat_id and query and answer_parts and app and user_email:
            saved = await _save_exchange(
                service,
                app,
                chat_id=chat_id,
                user_email=user_email,
                query=query,
                answer="".join(answer_parts),
                citations=state["citations"],
            )
            if not saved:
                events.append(
                    _sse_error(
                        detail=f"Failed to save chat exchange for chat_id={chat_id}",
                        code="persist_error",
                        status="500",
                        title="Failed to save chat",
                    )
                )
        state["answer_parts"] = []
        state["citations"] = []

    return events


async def _fetch_article(guid, uri):
    pass


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {dumps(data)}\n\n"


def _sse_error(
    detail: str,
    code: str = "proxy_error",
    status: str = "500",
    title: str = "Research tool error",
    errors: Optional[list] = None,
) -> str:
    """Shape errors similarly to Agents/Runs API error responses."""
    payload = {
        "errors": errors
        or [
            {
                "status": status,
                "code": code,
                "title": title,
                "detail": detail,
            }
        ]
    }
    return _sse_event("error", payload)


def _sse_chat(chat_id: str) -> str:
    return _sse_event("chat", {"chat_id": chat_id})


async def _proxy_error_event(resp: aiohttp.ClientResponse) -> str:
    body_text = await resp.text()
    logger.error(
        "Research tool proxy error status=%s body=%s",
        resp.status,
        body_text[:500],
    )
    try:
        body = loads(body_text)
        if isinstance(body, dict) and body.get("errors"):
            return _sse_error(
                detail=body_text,
                code="proxy_error",
                status=str(resp.status),
                errors=body["errors"],
            )
    except (ValueError, TypeError):
        pass

    return _sse_error(
        detail=body_text or f"Proxy request failed with status {resp.status}",
        code="proxy_error",
        status=str(resp.status),
        title="Proxy request failed",
    )


class ResearchToolResource(Resource):
    endpoint_name = "research_tool"
    resource_methods = ["GET", "POST", "DELETE"]
    item_methods = ["GET", "PATCH", "DELETE"]
    schema = CHAT_SCHEMA
    query_objectid_as_string = True
    privileges = {
        "GET": "archive",
        "POST": "archive",
        "PATCH": "archive",
        "DELETE": "archive",
    }
    mongo_indexes = {
        "chat_id": ([("chat_id", 1)], {"unique": True, "background": True}),
        "user_email": ([("user_email", 1)], {"background": True}),
    }


class ResearchToolService(AsyncBaseService):
    async def get_async(self, req, lookup):
        lookup = lookup or {}
        lookup["user_email"] = _current_user_email()
        return await super().get_async(req, lookup)

    async def on_create_async(self, docs: list[dict]) -> None:
        for doc in docs:
            # Stream saves pass user_email explicitly (no request auth context).
            if not (doc.get("user_email") or "").strip():
                doc["user_email"] = _current_user_email()
            if not doc.get("chat_title"):
                for msg in doc.get("messages", []):
                    if msg.get("type") == "QUERY" and msg.get("value"):
                        doc["chat_title"] = _chat_title_from_query(msg["value"])
                        break
                if not doc.get("chat_title"):
                    doc["chat_title"] = _("Untitled")

    async def on_update_async(self, updates: dict, original: dict) -> None:
        # Skip when called from stream persistence (no request user); callers
        # like append_exchange already enforce ownership with the captured email.
        email = ((get_user() or {}).get("email") or "").strip()
        if email:
            _assert_chat_owner(original, email)
        if "chat_title" in updates:
            updates["chat_title"] = updates["chat_title"]

    async def on_fetched_item_async(self, doc: dict) -> None:
        _assert_chat_owner(doc, _current_user_email())

    async def list_user_chat_summaries(self, user_email: str) -> list[dict]:
        cursor = await self.find_async(where={"user_email": user_email})
        docs = await cursor.sort("_updated", -1).to_list(length=None)
        return [
            {
                key: doc[key]
                for key in ("_id", "chat_id", "chat_title", "_updated")
                if key in doc
            }
            for doc in docs
        ]

    async def get_user_chat_detail(self, chat_id: str) -> Optional[dict]:
        return await self.find_one_async(
            req=None,
            chat_id=chat_id,
            user_email=_current_user_email(),
        )

    async def append_exchange(
        self,
        *,
        chat_id: str,
        user_email: str,
        query: str,
        answer: str,
        citations: Optional[list] = None,
    ) -> None:
        now = utcnow()
        query_message = {"type": "QUERY", "value": query, "created": now}
        response = {
            "type": "RESPONSE",
            "value": answer,
            "citations": citations or [],
            "created": now,
        }

        doc = await self.find_one_async(req=None, chat_id=chat_id)
        if doc:
            _assert_chat_owner(doc, user_email)
            messages = doc.get("messages", []) + [query_message, response]
            await self.patch_async(doc["_id"], {"messages": messages})
            return

        await self.post_async(
            [
                {
                    "chat_id": chat_id,
                    "chat_title": _chat_title_from_query(query),
                    "messages": [query_message, response],
                    "user_email": user_email,
                }
            ]
        )

    async def stream_proxy_async(
        self, lookup=None
    ) -> AsyncIterator[str]:
        """Proxy SSE chunks from the research tool agent API."""
        lookup = lookup or {}
        config = lookup.get("config") or {}
        query = (lookup.get("query") or "").strip()
        if not query:
            yield _sse_error(
                detail="Missing query parameter 'q'",
                code="bad_request",
                status="400",
                title="Invalid request",
            )
            return

        # Reuse client chat_id or create one; always return it early on the stream.
        chat_id = (lookup.get("chat_id") or "").strip() or str(uuid4())
        yield _sse_chat(chat_id)

        url = (config.get("RESEARCH_TOOL_PROXY_URL") or "").rstrip("/")
        api_key = config.get("RESEARCH_TOOL_API_KEY") or ""
        agent_id = config.get("RESEARCH_TOOL_AGENT_ID") or ""
        timeout_seconds = int(config.get("RESEARCH_TOOL_TIMEOUT_SECONDS") or 120)
        if not url or not api_key or not agent_id:
            yield _sse_error(
                detail=(
                    "Research tool proxy is not configured "
                    "(RESEARCH_TOOL_PROXY_URL, RESEARCH_TOOL_API_KEY, "
                    "RESEARCH_TOOL_AGENT_ID)"
                ),
                code="misconfigured",
                status="500",
                title="Research tool misconfigured",
            )
            return

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        body = {
            "agent": agent_id,
            "input": query,
            "stream": True,
            "thread_id": chat_id,
        }
        timeout = aiohttp.ClientTimeout(total=timeout_seconds, connect=10)

        try:
            async with (
                aiohttp.ClientSession(timeout=timeout) as session,
                session.post(url, json=body, headers=headers) as resp,
            ):
                if resp.status >= 400:
                    yield await _proxy_error_event(resp)
                    return

                async for chunk in resp.content.iter_any():
                    text = chunk.decode("utf-8", errors="replace")
                    yield text
        except aiohttp.ClientError as exc:
            logger.exception("Research tool proxy request failed")
            yield _sse_error(
                detail=str(exc),
                code="proxy_error",
                status="502",
                title="Proxy request failed",
            )
        except Exception:
            logger.exception("Unexpected research tool proxy error")
            yield _sse_error(
                detail="Unexpected proxy error",
                code="proxy_error",
                status="500",
                title="Unexpected proxy error",
            )


def _join_str_list(value) -> str:
    """Join a list of strings; pass through strings; empty for other values."""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return " ".join(str(part).strip() for part in value if part not in (None, ""))
    return ""


def _normalize_citation(citation: dict) -> dict:
    """Normalize citation payloads."""
    if not citation:
        return {}

    return {
        "citation_id": citation.get("search_result_number", ""),
        "uri": citation.get("uri"),
        "slugline": citation.get("slugline"),
        "headline": citation.get("headline"),
        "description": _join_str_list(citation.get("snippets")),
        "date_published": citation.get("created"),
        "language": citation.get("language"),
        "source": citation.get("infosource"),
        "type": _join_str_list(citation.get("content_types")),
    }


def _current_user_email() -> str:
    email = ((get_user() or {}).get("email") or "").strip()
    if not email:
        raise SuperdeskApiError.badRequestError(_("Missing user email."))
    return email


def _assert_chat_owner(doc: dict, email: str) -> None:
    if doc.get("user_email") != email:
        raise SuperdeskApiError.forbiddenError(_("Not allowed to access this chat."))


def _chat_title_from_query(query: str) -> str:
    title = " ".join(query.split())
    if not title:
        return _("Untitled")
    if len(title) <= CHAT_TITLE_MAX_LENGTH:
        return title
    return title[: CHAT_TITLE_MAX_LENGTH - 1].rstrip() + "…"


def init_app(app):
    from superdesk import blueprint, register_resource

    register_resource(
        "research_tool", ResearchToolResource, ResearchToolService, _app=app
    )
    blueprint(bp, app)
