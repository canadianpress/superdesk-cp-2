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
                logger.info(f"Error closing MongoDB connection: {e}")

    def find(self, query, params):
        """Execute a search query and return matching items."""
        self._log_search_request(query, params)
        params = params or {}

        try:
            logger.info("Extracting pagination parameters...")
            pagination_params = self._extract_pagination_params(params)

            logger.info("Building search query with params: %s", params)
            search_query = self._build_search_query(params)
            logger.info("Generated search query: %s", search_query)

            logger.info("Building aggregation pipeline...")
            pipeline = self._build_aggregation_pipeline(search_query, pagination_params)
            logger.info("Generated pipeline: %s", pipeline)

            logger.info("Executing search...")
            items = self._execute_search(pipeline)
            logger.info("Search returned %d raw items", len(items))

            logger.info("Transforming items...")
            transformed_items = self._transform_items(items)
            total_count = len(transformed_items)
            logger.info("Search completed successfully with %d results", total_count)

            return ArchiveListCursor(transformed_items, total_count)

        except Exception as e:
            logger.info("Search failed with error: %s", str(e))
            return ArchiveListCursor([], 0)

    def _log_search_request(self, query, params):
        """Log debug information about the search request."""
        logger.info("=== Archive Search Provider Debug ===")
        logger.info("Raw Query: %s", query)
        logger.info("Raw Params: %s", params)

    def _extract_pagination_params(self, params):
        return {"limit": params.get("limit", 50), "skip": params.get("skip", 0)}

    def _build_search_query(self, params):
        pipeline = []
        
        if any(params.get(field) and params[field].strip() 
               for field in ['headline', 'story_text', 'slugline']):
            should_clauses = []
            
            if params.get('headline') and params['headline'].strip():
                should_clauses.append({
                    "text": {
                        "query": params['headline'].strip(),
                        "path": "item.headlines.value"
                    }
                })
                
            if params.get('story_text') and params['story_text'].strip():
                should_clauses.append({
                    "text": {
                        "query": params['story_text'].strip(),
                        "path": "item.bodies.value"
                    }
                })
                
            if params.get('slugline') and params['slugline'].strip():
                should_clauses.append({
                    "text": {
                        "query": params['slugline'].strip(),
                        "path": "item.slugline"
                    }
                })
            
            if should_clauses:  # Only add $search if we have valid clauses
                pipeline.append({
                    "$search": {
                        "index": "default",
                        "compound": {
                            "should": should_clauses
                        }
                    }
                })
        
        if params.get('from') or params.get('to'):
            pipeline.append({
                "$match": {
                    "item.versioncreated": {
                        "$gte": datetime.fromisoformat(params.get('from')) if params.get('from') else datetime.min,
                        "$lte": datetime.fromisoformat(params.get('to')) if params.get('to') else datetime.max
                    }
                }
            })
        
        pipeline.append({
            "$sort": {
                "item.versioncreated": -1  # -1 for descending order
            }
        })
        
        return pipeline

    def _build_aggregation_pipeline(self, search_query, pagination_params=None):
        """Build the MongoDB aggregation pipeline."""
        pipeline = []
        
        pipeline.extend(search_query)
        
        pipeline.append({
            "$sort": {
                "item.versioncreated": -1  # newest first
            }
        })
        
        # Add pagination with proper limits
        if pagination_params:
            pipeline.extend([
                {"$skip": int(pagination_params["skip"])},
                {"$limit": int(pagination_params["limit"])}
            ])
        else:
            pipeline.append({"$limit": 50})  # reasonable default limit
        
        return pipeline

    def _execute_search(self, pipeline):
        """Execute the search pipeline and return results."""
        try:
            cursor = self.collection.aggregate(
                pipeline,
                hint="item.versioncreated_1"  # Assuming you have this index
            )
            results = list(cursor)
            return results
        except Exception as e:
            logger.info(f"Pipeline execution failed: {str(e)}")
            logger.info(f"Pipeline that failed: {pipeline}")
            return []

    def _transform_items(self, items):
        """Transform MongoDB documents to Superdesk format."""
        transformed_items = []
        try:
            for item in items:
                try:
                    item_data = item.get('item', item)
                    
                    transformed_item = {
                        "guid": item_data.get("uri", ""),
                        "type": item_data.get("type", ""),
                        "headline": item_data.get("descriptions", [{}])[0].get("value", ""),
                        "description_text": (
                            item_data.get("descriptions", [{}])[0].get("value", "")[:200] + "..."
                        ),
                        "versioncreated": item_data.get("versioncreated"),
                        "slugline": item_data.get("slugline", ""),
                        "firstcreated": item_data.get("firstcreated"),
                        "language": item_data.get("language", ""),
                        "urgency": item_data.get("urgency"),
                        "version": item_data.get("version", ""),
                        "body_html": item_data.get("bodies", [{}])[0].get("value", ""),
                    }
                    transformed_items.append(transformed_item)
                except KeyError as ke:
                    logger.info(
                        "Missing required field while transforming item: %s", ke
                    )
                    logger.info("Problematic item: %s", item)
                except Exception as e:
                    logger.info("Error transforming individual item: %s", str(e))
        except Exception as e:
            logger.info("Error in item transformation process: %s", str(e))

        logger.info("Transformed %d items successfully", len(transformed_items))
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
