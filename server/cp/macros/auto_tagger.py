from flask_babel import lazy_gettext
from flask import current_app as app
from superdesk.cp.ai.semaphore import Semaphore

import logging
logger = logging.getLogger(__name__)

def callback(item, **kwargs):
    """This macro will tag the item using the AutoTagging service based on the item's content."""
    semaphore = Semaphore(app)
    # log item
    app.logger.info("Auto tagger items %s", item)
    tags = semaphore.get_tags(item)
    # log tags
    app.logger.info("Tags %s", tags)
    # log kwargs
    app.logger.info("kwargs %s", kwargs)
    
    # if tags:
    #     for key, values in tags.items():
    #         item.setdefault(key, [])
    #         for value in values:
    #             if qcode(value) not in map(qcode, item[key]):
    #                 item[key].append(value)

    # def qcode(value):
    #     return "{}:{}".format(value.get("scheme"), value.get("qcode"))

    return item


name = "auto-tagger"
label = lazy_gettext("Auto Tagger")
access_type = "backend"
action_type = "direct"



