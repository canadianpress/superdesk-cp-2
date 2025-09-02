from superdesk.resource import Resource
from superdesk.services import BaseService
from datetime import datetime, timezone
from .models import SCHEMA


class AppConfigResource(Resource):
    """Resource for application configuration items."""
    
    endpoint_name = 'app_config'
    resource_methods = ['GET', 'POST']
    item_methods = ['GET', 'PATCH', 'PUT', 'DELETE']
    schema = SCHEMA
    
    # Use privileges that the admin user actually has
    privileges = {
        'GET': 'archive',           # User has 'archive: 1'
        'POST': 'archive',          # User has 'archive: 1' 
        'PATCH': 'archive',         # User has 'archive: 1'
        'PUT': 'archive',           # User has 'archive: 1'
        'DELETE': 'archive'         # User has 'archive: 1'
    }


class AppConfigService(BaseService):
    """Service for application configuration items."""
    
    def on_insert(self, docs):
        """Handle insertion of configuration items - runs BEFORE schema validation."""
        for doc in docs:
            # Validate that the key is unique
            existing = self.find_one(req=None, key=doc['key'])
            if existing:
                raise ValueError(f"Configuration key '{doc['key']}' already exists")

    def on_update(self, updates, original):
        """Handle updates to configuration items."""
        
        # Update the updated_at timestamp
        updates['updated_at'] = datetime.now(timezone.utc)
        
        # If the key is being changed, check for uniqueness
        if 'key' in updates and updates['key'] != original['key']:
            existing = self.find_one(req=None, key=updates['key'])
            if existing:
                raise ValueError(f"Configuration key '{updates['key']}' already exists")

    def on_delete(self, doc):
        """Handle deletion of configuration items."""
        # Add any cleanup logic here
        pass

    def get_config_value(self, key, default=None):
        """Get a configuration value by key."""
        config = self.find_one(req=None, key=key)
        if config and config.get('is_active'):
            return config['value']
        return default

    def get_config_by_category(self, category):
        """Get all active configurations for a specific category."""
        return self.find(req=None, category=category, is_active=True)

    def get_all_active_configs(self):
        """Get all active configuration items."""
        return self.find(req=None, is_active=True)
