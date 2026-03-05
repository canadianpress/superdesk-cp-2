from asyncio import sleep
from logging import getLogger
from typing import AsyncIterator

from aiohttp import ClientSession
from quart import Response, request
from quart.json import dumps
from superdesk import get_resource_service
from superdesk.auth.decorator import blueprint_auth
from superdesk.eve_async.service import AsyncBaseService
from superdesk.flask import Blueprint
from superdesk.resource import Resource
from superdesk.utils import get_cors_headers

logger = getLogger(__name__)

bp = Blueprint("research_tool", __name__, url_prefix="/api")


@bp.route("/research_tool/stream", methods=["GET", "OPTIONS"])
@blueprint_auth()
async def research_tool_stream():
    research_tool_service = get_resource_service("research_tool")
    query = request.args.get("q", "")

    async def generate():
        async for item in research_tool_service.get_all_batch_async(
            lookup={"query": query}
        ):
            yield f"data: {dumps({**item, 'search': query})}\n\n"
        yield "event: done\ndata: \n\n"

    response = Response(generate(), mimetype="text/event-stream")
    response.headers.update([*get_cors_headers(["GET"]), ("Cache-Control", "no-cache")])

    return response


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
    async def get_all_batch_async(
        self, size=500, max_iterations=10000, lookup=None
    ) -> AsyncIterator[dict]:
        async with ClientSession() as session:
            for i in range(1, 11):
                logger.info(f"Streaming item {i}: {lookup}")

                try:
                    async with session.get(
                        "https://www.google.com", timeout=5
                    ) as response:
                        status_code = response.status
                    await sleep(1)
                except Exception as e:
                    logger.error(f"Failed to fetch: {e}")
                    status_code = "error"

                yield {
                    "iteration": i,
                    "status": "processing",
                    "http_code": status_code,
                    "_id": i,
                }


def init_app(app):
    from superdesk import blueprint, register_resource

    register_resource(
        "research_tool", ResearchToolResource, ResearchToolService, _app=app
    )
    blueprint(bp, app)
