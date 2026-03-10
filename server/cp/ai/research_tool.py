from asyncio import create_task, get_event_loop, sleep
from logging import getLogger
from re import compile
from typing import AsyncIterator

from quart import Response, request
from quart.json import dumps, loads
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
                guid, uri = match.groups()
                logger.info(f"CITATION FOUND: {guid} {uri}")
                create_task(_fetch_article(guid, uri))
                yield f"event: response.citation\ndata: {dumps({'guid': guid, 'uri': uri})}\n\n"
                window = window[match.end() :]
            elif len(window) > WINDOW_SIZE:
                window = window[-WINDOW_SIZE // 2 :]
        except (IndexError, ValueError):
            pass

        yield item

    yield "event: done\ndata: \n\n"


async def _fetch_article(guid, uri):
    pass


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
        yield 'event: response.created\ndata: {"seq_id": 0, "type": "response.created"}\n\n'
        yield 'event: response.starting\ndata: {"seq_id": 1, "type": "response.starting"}\n\n'

        deltas = [
            "Mark",
            " Carney",
            " is",
            " Canada",
            "'s",
            " 24th",
            " PM",
            " [[",
            "21",
            "](http://cp.org/6f5681c8)]",
            ".",
            "\n\n",
            "Born",
            " in",
            " Fort",
            " Smith",
            " [[",
            "60",
            "](http://cp.org/31d3bba2)]",
            ".",
        ]

        for i, word in enumerate(deltas, start=2):
            payload = {
                "seq_id": i,
                "type": "response.output_text.delta",
                "response": {
                    "output_index": 0,
                    "type": "message.answer",
                    "delta": word,
                },
            }
            yield f"id: {i}\nevent: response.output_text.delta\ndata: {dumps(payload)}\n\n"
            await sleep(0.2)


def init_app(app):
    from superdesk import blueprint, register_resource

    register_resource(
        "research_tool", ResearchToolResource, ResearchToolService, _app=app
    )
    blueprint(bp, app)
