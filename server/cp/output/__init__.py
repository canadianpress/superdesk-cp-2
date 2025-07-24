import os
import lxml.etree as etree
import json

from .formatter.jimi import JimiFormatter  # noqa
from .formatter.newsmlg2 import CPNewsMLG2Formatter  # noqa
from .formatter.cp_ninjs_formatter import CPNINJSFormatter  # noqa
from .formatter.jimi_2 import Jimi2Formatter  # noqa
from .formatter.ninjs_formatter_2 import NINJSFormatter_2  # noqa
from .formatter.ninjs_21 import NINJS21Formatter 
from .formatter.cp_ninjs_newsroom_formatter import CPNewsroomNinjsFormatter  # noqa

from superdesk.publish.publish_service import PublishService, set_publish_service


class CPPublishService(PublishService):
    @classmethod
    def get_filename(cls, queue_item):
        orig = PublishService.get_filename(queue_item)
        name, ext = os.path.splitext(orig)
        
        # Check if the formatted item is JSON (NINJS) or XML (JIMI)
        formatted_item = queue_item["formatted_item"]
        
        # Try to parse as JSON first (for NINJS formatters)
        try:
            json_data = json.loads(formatted_item)
            # For NINJS, use the guid as filename
            if isinstance(json_data, dict) and "guid" in json_data:
                return "{}{}".format(json_data["guid"], ext)
        except (json.JSONDecodeError, TypeError):
            pass
        
        # Try to parse as XML (for JIMI formatters)
        try:
            item = etree.fromstring(formatted_item.encode("utf-8"))
            filename = item.find("ContentItem").find("FileName").text
            return "{}{}".format(filename, ext)
        except (etree.XMLSyntaxError, AttributeError):
            pass
        return "{}{}".format("-".join(name.split("-")[:-2]), ext)


set_publish_service(CPPublishService)
