from superdesk.resource import Resource
from superdesk.services import BaseService
from datetime import datetime, timezone
from .models import SCHEMA
import logging
import requests

logger = logging.getLogger(__name__)


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
            
            # Special handling for semaphore_api_key insertions
            if doc.get('key') == 'semaphore_api_key' and 'value' in doc:
                self._validate_and_update_semaphore_api_key(doc, {})

    def on_update(self, updates, original):
        """Handle updates to configuration items - runs BEFORE the update is applied."""
        
        # Update the updated_at timestamp
        updates['updated_at'] = datetime.now(timezone.utc)
        
        # If the key is being changed, check for uniqueness
        if 'key' in updates and updates['key'] != original['key']:
            existing = self.find_one(req=None, key=updates['key'])
            if existing:
                raise ValueError(f"Configuration key '{updates['key']}' already exists")
        
        # Special handling for semaphore_api_key updates
        if original.get('key') == 'semaphore_api_key' and 'value' in updates:
            self._validate_and_update_semaphore_api_key(updates, original)

    def on_updated(self, updates, original):
        """Handle updates to configuration items - runs AFTER the update is applied."""
        # This hook runs after the update is successfully applied to the database
        # Use this for post-update actions like notifications, cache clearing, etc.
        if original.get('key') == 'semaphore_api_key':
            logger.info(f"Semaphore API key was updated.")

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

    def _validate_and_update_semaphore_api_key(self, updates, original):
        """Validate and update semaphore API key with proper expiry information"""
        try:
            from settings import (
                SEMAPHORE_TOKEN_URL, 
                SEMAPHORE_API_KEY_URL
            )
            
            # Validate the new API key
            new_api_key = updates['value']
            logger.info(f"Validating new Semaphore API key...")
            
            # Get access token using the provided API key
            token_response = self._get_semaphore_access_token(new_api_key, SEMAPHORE_TOKEN_URL)
            if not token_response:
                logger.error("Failed to get access token for API key validation")
                raise ValueError("Invalid API key - failed to get access token")
            
            access_token = token_response.get("access_token")
            if not access_token:
                logger.error("No access token in response for API key validation")
                raise ValueError("Invalid API key - no access token received")
            
            # Get key info using the access token
            key_info = self._get_semaphore_key_info(access_token, SEMAPHORE_API_KEY_URL)
            if not key_info:
                logger.error("API key validation failed - could not get key info")
                raise ValueError("Invalid API key - validation failed")
            
            # Update the expiry date with the validated information
            updates['expiry_date'] = key_info['expiryDate']
            
            # Set appropriate description based on whether this is insert or update
            if original:  # Update case
                updates['description'] = f"Semaphore API key for autotagger. Expiry: {key_info['expiryDate']}. Last updated: {datetime.now(timezone.utc).isoformat()}"
            else:  # Insert case
                updates['description'] = f"Semaphore API key for autotagger. Expiry: {key_info['expiryDate']}. Created: {datetime.now(timezone.utc).isoformat()}"
            
            # Ensure category is set
            if 'category' not in updates:
                updates['category'] = 'api_key'
            
            # Ensure is_active is set
            if 'is_active' not in updates:
                updates['is_active'] = True
            
            logger.info(f"API key validation successful. New expiry: {key_info['expiryDate']}")
            
        except Exception as e:
            logger.error(f"Error validating Semaphore API key: {e}")
            raise ValueError(f"API key validation failed: {str(e)}")
    
    def _get_semaphore_access_token(self, api_key: str, token_url: str):
        """Get access token using API key"""
        try:
            payload = f"grant_type=apikey&key={api_key}"
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            
            response = requests.post(token_url, headers=headers, data=payload, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Token request failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting access token: {str(e)}")
            return None
    
    def _get_semaphore_key_info(self, access_token: str, api_key_url: str):
        """Get key information using access token"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(api_key_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                key_info = response.json()
                logger.info(f"API key validation successful. Expiry: {key_info.get('expiryDate')}")
                return key_info
            else:
                logger.warning(f"Key info request failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting key info: {str(e)}")
            return None
    

