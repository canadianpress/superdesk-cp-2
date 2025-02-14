import os
from pymongo import MongoClient
import pymongo
from pymongo.errors import ServerSelectionTimeoutError, NetworkTimeout
from superdesk.utils import ListCursor
from superdesk.search_provider import SearchProvider
import math
import logging
import requests
from datetime import datetime
from flask import current_app as app
import superdesk
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
session = requests.Session()


MONGO_CLUSTER = os.getenv("ARCHIVE_SEARCH_MONGO_CLUSTER", "")
MONGO_COLLECTION = os.getenv("ARCHIVE_SEARCH_MONGO_COLLECTION", "")
MONGO_URI = os.getenv("ARCHIVE_SEARCH_MONGO_URI", "")


class ArchiveListCursor(ListCursor):
    def __init__(self, docs, count):
        super().__init__(docs)
        self._count = count

    def __len__(self):
        return len(self.docs)

    def count(self, **kwargs):
        return self._count

class ArchiveSearchProvider(SearchProvider):
    label = "Archive Search"
    
    def __init__(self, provider):
        super().__init__(provider)
        self.config = provider.get("config") or {}
        self.client = None
        self.db = None
        self.collection = None
        self._initialize_mongodb()
        
    def _initialize_mongodb(self):
        """Initialize MongoDB connection with error handling"""
        try:
            self.client = MongoClient(MONGO_URI)
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB Atlas")
            self.db = self.client[MONGO_CLUSTER]
            self.collection = self.db[MONGO_COLLECTION]
            
        except (ServerSelectionTimeoutError, NetworkTimeout) as e:
            self._log_mongodb_connection_error(e)
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            raise
            
    def _log_mongodb_connection_error(self, error):
        """Log detailed MongoDB connection error information."""
        logger.error(f"Failed to connect to MongoDB Atlas: {error}")
        logger.error("Please verify:")
        logger.error("1. The MongoDB URI is correct")
        logger.error("2. Your IP address is whitelisted in MongoDB Atlas")
        logger.error("3. Network connectivity to MongoDB Atlas is available")

    def __del__(self):
        """Cleanup MongoDB connection when the provider is destroyed"""
        if self.client:
            try:
                self.client.close()
                logger.info("MongoDB connection closed")
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {e}")

    def find(self, query, params):
        """Execute a search query and return matching items."""
        self._log_search_request(query, params)
        params = params or {}

        try:
            pagination_params = self._extract_pagination_params(params)
            search_query = self._build_search_query(params)
            pipeline = self._build_aggregation_pipeline(search_query, pagination_params)
            items = self._execute_search(pipeline)
            transformed_items = self._transform_items(items)
            total_count = len(transformed_items)
            return ArchiveListCursor(transformed_items, total_count)

        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            return ArchiveListCursor([], 0)

    def _log_search_request(self, query, params):
        """Log debug information about the search request."""
        logger.info("=== Archive Search Provider Debug ===")
        logger.info("Provider ID: %s", self.provider.get('_id'))
        logger.info("Raw Query: %s", query)
        logger.info("Raw Params: %s", params)

    def _extract_pagination_params(self, params):
        return {
            'limit': params.get('limit', 25),
            'skip': params.get('skip', 0)
        }

    def _build_search_query(self, params):
        """Build the MongoDB Atlas Search query based on search parameters."""
        must_clauses = []
        
        # if params.get('from') or params.get('to'):
        #     must_clauses.append(self._build_date_range_filter(params))
        
        text_search_fields = {
            "headline": "item.headlines.value",
            "slugline": "item.slugline",
            "story_text": "item.bodies.value"
        }
        
        for param_name, field_path in text_search_fields.items():
            if params.get(param_name):
                must_clauses.append(self._build_text_search_filter(
                    params[param_name], field_path))

        return {
            "$search": {
                "index": "search_index",
                "compound": {
                    "must": must_clauses
                }
            }
        }

    def _build_date_range_filter(self, params):
        """Build date range filter for the search query."""
        return {
            "range": {
                "path": "item.versioncreated",
                "gte": params.get('from'),
                "lte": params.get('to'),
            }
        }

    def _build_text_search_filter(self, query_text, field_path):
        """Build text search filter for the search query."""
        return {
            "text": {
                "query": query_text,
                "path": field_path
                # "fuzzy": {
                #     "maxEdits": 2
                # }
            }
        }

    def _build_aggregation_pipeline(self, search_query, pagination_params):
        """Build the MongoDB aggregation pipeline."""
        return [
            search_query,
            {"$skip": pagination_params['skip']},
            {"$limit": pagination_params['limit']},
            {
                "$project": {
                    "_id": 1,
                    "guid": "$item.uri",
                    "version": "$item.version",
                    "type": "$item.type",
                    "headline": {"$first": "$item.headlines.value"},
                    "body_html": {"$first": "$item.bodies.value"},
                    "versioncreated": "$item.versioncreated",
                    "firstcreated": "$item.firstcreated",
                    "slugline": "$item.slugline",
                    "language": "$item.language",
                    "subjects": "$item.subjects",
                    "keywords": "$item.keywords",
                    "urgency": "$item.urgency"                
                    }
,
            }
        ]

    def _execute_search(self, pipeline):
        """Execute the search pipeline and return results."""
        try:
            cursor = self.collection.aggregate(pipeline)
            return list(cursor)
        except Exception as e:
            logger.error(f"Error executing search pipeline: {e}")
            return []

    def _transform_items(self, items):
        """Transform MongoDB documents to Superdesk format."""
        transformed_items = []
        for item in items:
            transformed_items.append({
                'guid': item['guid'],
                'type': item['type'],
                'headline': item['headline'],
                'description_text': item['body_html'][:200] + '...' if item['body_html'] else '',
                'versioncreated': item['versioncreated'],
                'slugline': item.get('slugline', ''),
                'firstcreated': item['firstcreated'],
                'language': item['language'],
                'urgency': item['urgency'],
                'version': item['version'],
                'body_html': item['body_html'],
            })
        return transformed_items


def init_app(app):
    logger.info("=== Initializing Archive Search Provider ===")
    try:
        superdesk.register_search_provider(
            "archive_search", provider_class=ArchiveSearchProvider
        )
        logger.info("Archive Search Provider registered successfully")
    except Exception as e:
        logger.error("Failed to register Archive Search Provider: %s", str(e))
    logger.info("=== End Archive Search Provider Initialization ===")
