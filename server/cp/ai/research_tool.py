from asyncio import create_task, get_event_loop
from collections.abc import AsyncIterator
from logging import getLogger
from re import compile
from typing import Optional
from urllib.parse import urljoin
from uuid import uuid4

import aiohttp
from quart import Response, current_app as app, request
from quart.json import dumps, loads
from superdesk import get_resource_service
from superdesk.auth.decorator import blueprint_auth
from superdesk.eve_async.service import AsyncBaseService
from superdesk.flask import Blueprint
from superdesk.resource import Resource
from superdesk.utils import get_cors_headers

logger = getLogger(__name__)

bp = Blueprint("research_tool", __name__, url_prefix="/api")

RUNS_PATH = "/v1/agents/runs"
CITATION_REGEX = compile(r"\[(\d+)\]\((https?://[^\s)]+)\)")
WINDOW_SIZE = 500


@bp.route("/research_tool/stream", methods=["GET", "OPTIONS"])
@blueprint_auth()
async def research_tool_stream():
    response = Response(
        _research_tool_generator(
            get_resource_service("research_tool"),
            request.args.get("q", ""),
            request.args.get("thread_id") or None,
        ),
        mimetype="text/event-stream",
    )
    response.headers.update([*get_cors_headers(["GET"]), ("Cache-Control", "no-cache")])

    return response


async def _research_tool_generator(service, query, thread_id=None):
    """
    Proxy SSE passthrough for Agents/Runs events:
    response.created, response.starting, response.output_text.delta,
    response.output_item.added, response.output_content.full,
    response.output_item.done, response.done

    Plus CP middleware events: thread (early), response.citation (from inline links).
    """
    window = ""
    async for item in service.get_all_batch_async(
        lookup={"query": query, "thread_id": thread_id}
    ):
        if "data: " not in item:
            yield item
            continue

        try:
            data = await get_event_loop().run_in_executor(
                None, loads, item.split("data: ")[1].strip()
            )
            # Only scan text deltas for inline [n](url) citations
            if data.get("type") == "response.output_text.delta":
                window += data.get("response", {}).get("delta", "") or ""
                match = await get_event_loop().run_in_executor(
                    None, CITATION_REGEX.search, window
                )
                if match:
                    citation_id, uri = match.groups()
                    logger.info(f"CITATION FOUND: {citation_id} {uri}")
                    create_task(_fetch_article(citation_id, uri))
                    citation = {
                        "citation_id": citation_id,
                        "uri": uri,
                        "slugline": f"slugline-{citation_id}",
                        "headline": f"headline-{citation_id}",
                        "description": f"description-{citation_id}",
                        "date_published": f"date_published-{citation_id}",
                        "language": f"language-{citation_id}",
                        "source": f"source-{citation_id}",
                        "type": f"type-{citation_id}",
                    }
                    yield f"event: response.citation\ndata: {dumps(citation)}\n\n"
                    window = window[match.end() :]
                elif len(window) > WINDOW_SIZE:
                    window = window[-WINDOW_SIZE // 2 :]
        except (IndexError, ValueError, TypeError):
            pass

        yield item


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


def _sse_thread(thread_id: str) -> str:
    return _sse_event("thread", {"thread_id": thread_id})


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
    resource_methods = ["GET"]
    schema = {
        "iteration": {"type": "integer"},
        "status": {
            "type": "string",
        },
    }
    privileges = {
        "GET": "archive",
    }


class ResearchToolService(AsyncBaseService):
    def _proxy_config(self):
        base_url = (app.config.get("RESEARCH_TOOL_PROXY_URL") or "").rstrip("/")
        api_key = app.config.get("RESEARCH_TOOL_API_KEY") or ""
        agent_id = app.config.get("RESEARCH_TOOL_AGENT_ID") or ""
        timeout_seconds = int(app.config.get("RESEARCH_TOOL_TIMEOUT_SECONDS") or 120)
        return base_url, api_key, agent_id, timeout_seconds

    async def get_all_batch_async(
        self, size=500, max_iterations=10000, lookup=None
    ) -> AsyncIterator[str]:
        lookup = lookup or {}
        query = (lookup.get("query") or "").strip()
        if not query:
            yield _sse_error(
                detail="Missing query parameter 'q'",
                code="bad_request",
                status="400",
                title="Invalid request",
            )
            return

        # Reuse client thread_id or create one; always return it early on the stream.
        thread_id = (lookup.get("thread_id") or "").strip() or str(uuid4())
        yield _sse_thread(thread_id)

        base_url, api_key, agent_id, timeout_seconds = self._proxy_config()
        if not base_url or not api_key or not agent_id:
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

        url = urljoin(base_url + "/", RUNS_PATH.lstrip("/"))
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        body = {
            "agent": agent_id,
            "input": query,
            "stream": True,
            "thread_id": thread_id,
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

                buffer = ""
                async for chunk in resp.content.iter_any():
                    if not chunk:
                        continue
                    buffer += chunk.decode("utf-8", errors="replace")
                    while "\n\n" in buffer:
                        event, buffer = buffer.split("\n\n", 1)
                        event = event.strip("\n")
                        if event:
                            yield event + "\n\n"
                if buffer.strip():
                    yield buffer.strip("\n") + "\n\n"
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


def init_app(app):
    from superdesk import blueprint, register_resource

    register_resource(
        "research_tool", ResearchToolResource, ResearchToolService, _app=app
    )
    blueprint(bp, app)
