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
            self.client.admin.command("ping")
            logger.info("Successfully connected to MongoDB Atlas")
            self.db = self.client[MONGO_CLUSTER]
            self.collection = self.db[MONGO_COLLECTION]
            
        except (ServerSelectionTimeoutError, NetworkTimeout) as e:
            self._log_mongodb_connection_error(e)
            raise
        except Exception as e:
            logger.info(f"Unexpected error connecting to MongoDB: {e}")
            raise

    def _log_mongodb_connection_error(self, error):
        """Log detailed MongoDB connection error information."""
        logger.info(f"Failed to connect to MongoDB Atlas: {error}")
        logger.info("Please verify:")
        logger.info("1. The MongoDB URI is correct")
        logger.info("2. Your IP address is whitelisted in MongoDB Atlas")
        logger.info("3. Network connectivity to MongoDB Atlas is available")

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
        # self._log_search_request(query, params)
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
        logger.info(f"Provider ID: {self.provider.get('_id')}")
        logger.info(f"Raw Query: {query}")
        logger.info(f"Raw Params: {params}")

    def _extract_pagination_params(self, params):
        return {"limit": params.get("limit", 25), "skip": params.get("skip", 0)}

    def _build_search_query(self, params):
        """Build the MongoDB Atlas Search query based on search parameters."""
        pipeline = []
        search_clauses = []

        # Only search headlines, not both headlines and bodies
        if params.get("headline"):
            search_clauses.append({
                "text": {
                    "query": params["headline"],
                    "path": "item.headlines.value",
                    "fuzzy": {
                        "maxEdits": 2,
                        "prefixLength": 1
                    },
                    "score": { "boost": { "value": 2 } }  # Give more weight to headline matches
                }
            })

        if params.get("story_text"):
            search_clauses.append({
                "text": {
                    "query": params["story_text"],
                    "path": "item.bodies.value",
                    "fuzzy": {
                        "maxEdits": 2,
                        "prefixLength": 1
                    }
                }
            })

        if params.get("slugline"):
            search_clauses.append({
                "text": {
                    "query": params["slugline"],
                    "path": "item.slugline",
                    "fuzzy": {
                        "maxEdits": 2,
                        "prefixLength": 1
                    }
                }
            })

        # Add $search as first stage if we have text search criteria
        if search_clauses:
            pipeline.append({
                "$search": {
                    "index": "default",
                    "compound": {
                        "should": search_clauses  # Changed from "must" to "should" for more flexible matching
                    }
                }
            })

        # Add date range filter as a separate $match stage after $search
        if params.get("from") or params.get("to"):
            from_date = params.get("from", "")
            to_date = params.get("to", "")
            if from_date:
                from_date = self._parse_date_parameter(from_date, "", False)
            if to_date:
                to_date = self._parse_date_parameter(to_date, "", True)

            pipeline.append(
                {
                    "$match": {
                        "item.versioncreated": {"$gte": from_date, "$lte": to_date}
                    }
                }
            )

        # If no text search but we have date filter, start with a simple $match
        if not search_clauses and (from_date or to_date):
            pipeline = [
                {
                    "$match": {
                        "item.versioncreated": {
                            "$gte": from_date,
                            "$lte": to_date,
                        }
                    }
                }
            ]

        logger.info(f"Final pipeline: {pipeline}")
        return pipeline

    def _parse_date_parameter(self, date_str, default_date, is_end_date=False):
        """Convert date string to ISO format with a default fallback."""
        date_to_parse = date_str or default_date
        parsed_date = datetime.strptime(date_to_parse, "%Y-%m-%d")
        
        if is_end_date:
            parsed_date = parsed_date.replace(hour=23, minute=59, second=59)
            
        return f"{parsed_date.isoformat()}.000+00:00"

    def _build_aggregation_pipeline(self, search_query, pagination_params):
        """Build the MongoDB aggregation pipeline."""
        pipeline = []

        pipeline.extend(search_query)

        pipeline.extend(
            [
                {"$skip": pagination_params["skip"]},
                {"$limit": pagination_params["limit"]},
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
                        "urgency": "$item.urgency",
                    }
                },
            ]
        )

        return pipeline

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
        try:
            for item in items:
                try:
                    transformed_item = {
                        "guid": item["guid"],
                        "type": item["type"],
                        "headline": item["headline"],
                        "description_text": (
                            item["body_html"][:200] + "..." if item["body_html"] else ""
                        ),
                        "versioncreated": item["versioncreated"],
                        "slugline": item.get("slugline", ""),
                        "firstcreated": item["firstcreated"],
                        "language": item["language"],
                        "urgency": item["urgency"],
                        "version": item["version"],
                        "body_html": item["body_html"],
                    }
                    transformed_items.append(transformed_item)
                except KeyError as ke:
                    print(f"Missing required field while transforming item: {ke}")
                    print(f"Problematic item: {item}")
                except Exception as e:
                    print(f"Error transforming individual item: {str(e)}")
        except Exception as e:
            print(f"Error in item transformation process: {str(e)}")

        logger.info(f"Transformed {len(transformed_items)} items successfully")
        return transformed_items


def init_app(app):
    logger.info("=== Initializing Archive Search Provider ===")
    try:
        superdesk.register_search_provider(
            "archive_search", provider_class=ArchiveSearchProvider
        )
        logger.info("Archive Search Provider registered successfully")
    except Exception as e:
        logger.info("Failed to register Archive Search Provider: %s", str(e))
    logger.info("=== End Archive Search Provider Initialization ===")
