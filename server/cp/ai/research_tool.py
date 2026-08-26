from asyncio import create_task, get_event_loop
from logging import getLogger
from re import compile
from typing import AsyncIterator, Optional
from urllib.parse import urljoin

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


@bp.route("/research_tool/stream", methods=["GET", "OPTIONS"])
@blueprint_auth()
async def research_tool_stream():
    response = Response(
        _research_tool_generator(
            get_resource_service("research_tool"), request.args.get("q", "")
        ),
        mimetype="text/event-stream",
    )
    response.headers.update([*get_cors_headers(["GET"]), ("Cache-Control", "no-cache")])

    return response


CITATION_REGEX = compile(r"\[\[(\d+)\]\((https?://[^\s)]+)\)\]")
WINDOW_SIZE = 500


async def _research_tool_generator(service, query):
    window = ""
    async for item in service.get_all_batch_async(lookup={"query": query}):
        if "data: " not in item:
            yield item
            continue

        try:
            data = await get_event_loop().run_in_executor(
                None, loads, item.split("data: ")[1].strip()
            )
            window += data.get("response", {}).get("delta", "")
            match = await get_event_loop().run_in_executor(
                None, CITATION_REGEX.search, window
            )
            if match:
                citation_id, uri = match.groups()
                logger.info(f"CITATION FOUND: {citation_id} {uri}")
                create_task(_fetch_article(citation_id, uri))
                data = {
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
                yield f"event: response.citation\ndata: {dumps(data)}\n\n"
                window = window[match.end() :]
            elif len(window) > WINDOW_SIZE:
                window = window[-WINDOW_SIZE // 2 :]
        except (IndexError, ValueError):
            pass

        yield item

    yield "event: done\ndata: \n\n"


async def _fetch_article(guid, uri):
    pass


def _sse_error(message: str, code: Optional[str] = None) -> str:
    payload = {"message": message}
    if code:
        payload["code"] = code
    return f"event: error\ndata: {dumps(payload)}\n\n"


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
            yield _sse_error("Missing query parameter 'q'", "bad_request")
            return

        base_url, api_key, agent_id, timeout_seconds = self._proxy_config()
        if not base_url or not api_key or not agent_id:
            yield _sse_error(
                "Research tool proxy is not configured "
                "(RESEARCH_TOOL_PROXY_URL, RESEARCH_TOOL_API_KEY, RESEARCH_TOOL_AGENT_ID)",
                "misconfigured",
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
        }
        timeout = aiohttp.ClientTimeout(total=timeout_seconds, connect=10)

        try:
            async with (
                aiohttp.ClientSession(timeout=timeout) as session,
                session.post(url, json=body, headers=headers) as resp,
            ):
                if resp.status >= 400:
                    detail = await resp.text()
                    logger.error(
                        "Research tool proxy error status=%s body=%s",
                        resp.status,
                        detail[:500],
                    )
                    yield _sse_error(
                        f"Proxy request failed with status {resp.status}",
                        "proxy_error",
                    )
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
            yield _sse_error(f"Proxy request failed: {exc}", "proxy_error")
        except Exception:
            logger.exception("Unexpected research tool proxy error")
            yield _sse_error("Unexpected proxy error", "proxy_error")


def init_app(app):
    from superdesk import blueprint, register_resource

    register_resource(
        "research_tool", ResearchToolResource, ResearchToolService, _app=app
    )
    blueprint(bp, app)
