# you could write variables to /opt/superdesk/env.sh
. /opt/superdesk/env/bin/activate

set -a
LC_ALL=en_US.UTF-8
PYTHONUNBUFFERED=1
PATH=/opt/superdesk/client/node_modules/.bin/:$PATH

SECRET_KEY="thisisanewsecretcodethatwillneverbehackedordiscoveredbyghosts"
AUTH_SERVER_SHARED_SECRET="thisisanewsecretcodethatwillneverbehackedordiscoveredbyblueghosts"

SEMAPHORE_BASE_URL="https://ca.cloud.smartlogic.com/token"  
SEMAPHORE_ANALYZE_URL="https://ca.cloud.smartlogic.com/svc/5457e590-c2cc-4219-8947-e7f74c8675be/?operation=classify"
  
SEMAPHORE_API_KEY="mth-ZoIjiySCwh5oE2T9PA=="
SEMAPHORE_SEARCH_URL="https://ca.cloud.smartlogic.com/svc/5457e590-c2cc-4219-8947-e7f74c8675be/SES//CPKnowledgeSystem/en/hints/"
SEMAPHORE_GET_PARENT_URL="https://ca.cloud.smartlogic.com/svc/5457e590-c2cc-4219-8947-e7f74c8675be/SES/CPKnowledgeSystem/en/relatedfrom/"

[ ! -f /opt/superdesk/env.sh ] || . /opt/superdesk/env.sh

HOST=${HOST:-'localhost'}
HOST_SSL=${HOST_SSL:-}
DB_HOST=${DB_HOST:-'localhost'}
DB_NAME=${DB_NAME:-'superdesk'}

[ -n "${HOST_SSL:-}" ] && SSL='s' || SSL=''
# To work properly inside and outside container, must be
# - "proxy_set_header Host <host>;" in nginx
# - the same "<host>" for next two settings
# TODO: try to fix at backend side, it should accept any host
SUPERDESK_URL="http$SSL://$HOST/api"
CONTENTAPI_URL="http$SSL://$HOST/contentapi"
SUPERDESK_WS_URL="ws$SSL://$HOST/ws"
SUPERDESK_CLIENT_URL="http$SSL://$HOST"

MONGO_URI="mongodb://$DB_HOST/$DB_NAME"
LEGAL_ARCHIVE_URI="mongodb://$DB_HOST/${DB_NAME}_la"
ARCHIVED_URI="mongodb://$DB_HOST/${DB_NAME}_ar"
ELASTICSEARCH_URL="http://$DB_HOST:9200"
ELASTICSEARCH_INDEX="$DB_NAME"

CONTENTAPI_ELASTICSEARCH_INDEX="${DB_NAME}_ca"
# TODO: fix will be in 1.6 release, keep it for a while
CONTENTAPI_ELASTIC_INDEX=$CONTENTAPI_ELASTICSEARCH_INDEX
CONTENTAPI_MONGO_URI="mongodb://$DB_HOST/${CONTENTAPI_ELASTICSEARCH_INDEX}"

REDIS_URL=${REDIS_URL:-redis://$DB_HOST:6379/1}

C_FORCE_ROOT=1
CELERYBEAT_SCHEDULE_FILENAME=${CELERYBEAT_SCHEDULE_FILENAME:-/var/log/superdesk/celery/celerybeatschedule}
CELERY_BROKER_URL=${CELERY_BROKER_URL:-$REDIS_URL}

if [ -n "$AMAZON_CONTAINER_NAME" ]; then
    AMAZON_S3_SUBFOLDER=${AMAZON_S3_SUBFOLDER:-'superdesk'}
    MEDIA_PREFIX=${MEDIA_PREFIX:-"http$SSL://$HOST/api/upload-raw"}

    # TODO: remove after full adoption of MEDIA_PREFIX
    AMAZON_SERVE_DIRECT_LINKS=${AMAZON_SERVE_DIRECT_LINKS:-True}
    AMAZON_S3_USE_HTTPS=${AMAZON_S3_USE_HTTPS:-True}
fi

if [ -n "${SUPERDESK_TESTING:-}" ]; then
    SUPERDESK_TESTING=True
    CELERY_ALWAYS_EAGER=True
    ELASTICSEARCH_BACKUPS_PATH=/var/tmp/elasticsearch
    LEGAL_ARCHIVE=True
fi
set +a
