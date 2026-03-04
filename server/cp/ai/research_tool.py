from logging import getLogger
from time import sleep

from flask import Blueprint, Response, request
from flask.json import dumps
from superdesk import get_resource_service
from superdesk.auth.decorator import blueprint_auth
from superdesk.resource import Resource
from superdesk.services import BaseService
from superdesk.utils import ListCursor, get_cors_headers

logger = getLogger(__name__)

bp = Blueprint("research_tool", __name__, url_prefix="/api")


@bp.route("/research_tool/stream", methods=["GET", "OPTIONS"])
@blueprint_auth()
def research_tool_stream():
    research_tool_service = get_resource_service("research_tool")
    query = request.args.get("q", "")

    def generate():
        for item in research_tool_service.get_all_batch(lookup=query):
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


class ResearchToolService(BaseService):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def get(self, request, _=None):
        return ListCursor(list(self.get_all_batch(lookup=request.args.get("q", ""))))

    def get_all_batch(self, _=None, __=None, lookup=None):
        for i in range(1, 11):
            logger.info(f"Streaming item {i} {lookup}")

            yield {"iteration": i, "status": "processing"}
            sleep(1)


def init_app(app):
    from superdesk import blueprint, register_resource

    register_resource(
        "research_tool", ResearchToolResource, ResearchToolService, _app=app
    )
    blueprint(bp, app)
