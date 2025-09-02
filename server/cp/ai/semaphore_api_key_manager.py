# server/cp/ai/semaphore_api_key_manager.py
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import superdesk

logger = logging.getLogger(__name__)


class SemaphoreAPIKeyManager:
    """Manages Semaphore API keys with automatic renewal using Superdesk vocabularies"""

    def __init__(self, app):
        self.app = app
        self.base_url = app.config.get("SEMAPHORE_BASE_URL")
        self.token_url = f"{self.base_url}/token"
        self.api_key_url = f"{self.base_url}/api/account/apikey"
        self.current_key = None
        self.key_expiry = None
        self.renewal_threshold_days = 7
        self._config_loaded = False
        self._last_expiry_check = None
        self._expiry_check_cache_duration = 300  # 5 minutes cache
        self._cached_expiry_result = None

        logger.info("SemaphoreAPIKeyManager initialization complete")

    def _ensure_api_config_loaded(self):
        """Ensure app_config is loaded when needed (lazy loading)"""
        if self._config_loaded:
            return

        logger.info("Loading API key from api_config resource")

        try:
            # Try to get the service - it might not be available yet
            api_config_service = superdesk.get_resource_service("app_config")
            logger.info("API config service retrieved successfully")

            semaphore_api_config = api_config_service.find_one(
                req=None, key="semaphore_api_key"
            )

            if semaphore_api_config:
                logger.info("Found existing semaphore_api_config")
                logger.info(f"Semaphore API config: {semaphore_api_config}")

                if semaphore_api_config.get("value"):
                    logger.info("Found API key value in app_config")

                    # Extract the API key from the 'value' field
                    api_key = semaphore_api_config["value"]
                    logger.info(
                        f"API key found: ...{api_key[-4:] if len(api_key) > 4 else 'N/A'}"
                    )

                    # Set the current key
                    self.current_key = api_key

                    # Try to extract expiry from description
                    expiry_date = semaphore_api_config.get("expiry_date", "")
                    if expiry_date:
                        try:
                            self.key_expiry = datetime.fromisoformat(
                                expiry_date.replace("Z", "+00:00")
                            )
                        except Exception as e:
                            logger.warning(
                                f"Could not parse expiry from description: {e}"
                            )
                            self.key_expiry = None
                    else:
                        logger.warning("No expiry date found in app_config")
                        self.key_expiry = None

                    logger.info("Successfully loaded API key from app_config")
                    self._clear_cache()
                else:
                    logger.warning("No API key value found in app_config")
            else:
                logger.info("No existing semaphore_api_key found")

            self._config_loaded = True  # Fixed: Use consistent variable name
            logger.info("App_config loading complete")

        except Exception as e:
            logger.warning(f"Could not load key from app_config: {str(e)}")
            logger.warning("Will use configuration values")
            self._config_loaded = True  # Fixed: Use consistent variable name

    def get_valid_api_key(self) -> str:
        """Get a valid API key, renewing if necessary"""
        # Simple cache for valid keys
        self._ensure_api_config_loaded()
        if (
            self.current_key
            and self._last_expiry_check
            and not self._is_key_expired_or_near_expiry()
        ):
            logger.info("Returning cached valid API key (no expiry check needed)")
            return self.current_key

        if self._is_key_expired_or_near_expiry():
            logger.info("Key is expired or near expiry, initiating renewal process")
            self._renew_api_key()
        else:
            logger.info("Key is still valid, no renewal needed")

        if not self.current_key:
            logger.error("No valid API key available after renewal attempt")
            raise ValueError("No valid API key available")

        logger.info("Returning valid API key")
        return self.current_key

    def _is_key_expired_or_near_expiry(self) -> bool:
        """Check if current API key is expired or will expire within threshold"""
        current_time = datetime.now(timezone.utc)

        # Check cache first
        if (
            self._last_expiry_check
            and self._cached_expiry_result is not None
            and (current_time - self._last_expiry_check).total_seconds()
            < self._expiry_check_cache_duration
        ):
            return self._cached_expiry_result

        if not self.key_expiry:
            self._last_expiry_check = current_time
            self._cached_expiry_result = True
            return True

        # Add buffer time to avoid edge cases
        threshold_date = current_time + timedelta(days=self.renewal_threshold_days)

        is_expired = self.key_expiry <= threshold_date

        if is_expired:
            days_until_expiry = (self.key_expiry - current_time).days

        # Cache the result
        self._last_expiry_check = current_time
        self._cached_expiry_result = is_expired

        return is_expired

    def _renew_api_key(self):
        """Renew the API key using Semaphore API"""
        try:
            # First, get current key info to check expiry
            current_key_info = self._get_current_key_info()

            if current_key_info and not self._is_key_expired_or_near_expiry():
                # Key is still valid, just update our local state
                self.current_key = current_key_info.get("apikey")
                self.key_expiry = datetime.fromisoformat(
                    current_key_info.get("expiryDate").replace("Z", "+00:00")
                )  # Clear cache when key is updated
                self._clear_cache()
                return

            # Generate new key
            logger.info("Generating new API key")
            new_key_data = self._generate_new_key()

            if new_key_data and "apikey" in new_key_data:
                self.current_key = new_key_data["apikey"]
                self.key_expiry = datetime.fromisoformat(
                    new_key_data["expiryDate"].replace("Z", "+00:00")
                )

                # Persist the new key to vocabularies
                self._persist_key(new_key_data)

                # Clear cache when key is updated
                self._clear_cache()
            else:
                logger.error("Failed to get valid API key from renewal endpoint")

        except Exception as e:
            logger.error(f"Failed to renew API key: {str(e)}")
            if not self.current_key:
                logger.error("No current key available, raising error")
                raise

    def _clear_cache(self):
        """Clear the expiry check cache when key is updated"""
        self._last_expiry_check = None
        self._cached_expiry_result = None

    def _get_current_key_info(self) -> Optional[Dict[str, Any]]:
        """Get current API key information from Semaphore"""
        try:
            # First get access token using current key
            if not self.current_key:
                logger.warning("No current key available for getting key info")
                return None

            token_response = self._get_access_token(self.current_key)
            if not token_response:
                logger.error("Failed to get access token for current key")
                return None

            access_token = token_response.get("access_token")
            if not access_token:
                logger.error("No access token in response")
                return None

            # Get current key info
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(self.api_key_url, headers=headers, timeout=30)

            if response.status_code == 200:
                key_info = response.json()
                return key_info
            else:
                logger.error(
                    f"Failed to get key info: {response.status_code} - {response.text}"
                )
                return None

        except Exception as e:
            logger.error(f"Error getting current key info: {str(e)}")
            return None

    def _generate_new_key(self) -> Optional[Dict[str, Any]]:
        """Generate a new API key from Semaphore"""

        try:
            # Get access token using current key
            token_response = self._get_access_token(self.current_key)
            if not token_response:
                logger.error("Failed to get access token for key generation")
                return None

            access_token = token_response.get("access_token")
            if not access_token:
                logger.error("No access token for key generation")
                return None

            # Generate new key
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.put(self.api_key_url, headers=headers, timeout=30)

            if response.status_code == 200:
                new_key_data = response.json()
                logger.info("New API key generated successfully")
                return new_key_data
            else:
                logger.error(
                    f"Failed to generate new key: {response.status_code} - {response.text}"
                )
                return None

        except Exception as e:
            logger.error(f"Error generating new API key: {str(e)}")
            return None

    def _get_access_token(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Get access token using API key"""
        logger.info("Getting access token from Semaphore")

        try:
            payload = f"grant_type=apikey&key={api_key}"
            headers = {"Content-Type": "application/x-www-form-urlencoded"}

            response = requests.post(
                self.token_url, headers=headers, data=payload, timeout=30
            )

            if response.status_code == 200:
                token_data = response.json()
                logger.info("Access token obtained successfully")
                return token_data
            else:
                logger.error(
                    f"Failed to get access token: {response.status_code} - {response.text}"
                )
                return None

        except Exception as e:
            logger.error(f"Error getting access token: {str(e)}")
            return None

    def _persist_key(self, key_data: Dict[str, Any]):
        """Store key information in Superdesk app_config collection"""
        api_config_service = superdesk.get_resource_service("app_config")

        try:
            # Prepare key info for storage
            key_info = {
                "key": "semaphore_api_key",
                "value": key_data["apikey"],
                "description": f"Semaphore API key for autotagger. Expiry: {key_data['expiryDate']}. Last renewed: {datetime.now(timezone.utc).isoformat()}",
                "category": "api_key",
                "is_active": True,
                "expiry_date": key_data["expiryDate"],
            }

            # Check if key already exists
            existing = api_config_service.find_one(req=None, key="semaphore_api_key")

            if existing:
                try:
                    # Try the update
                    api_config_service.update(
                        existing["_id"],  # id
                        key_info,  # updates
                        existing,  # original document
                    )

                    # Verify the update actually worked
                    updated = api_config_service.find_one(
                        req=None, key="semaphore_api_key"
                    )

                    if updated and updated.get("value") == key_data["apikey"]:
                        logger.info(
                            "Update verification successful - new key is in database"
                        )
                    else:
                        logger.warning(
                            "Update verification failed - new key not found in database"
                        )
                        raise RuntimeError(
                            "Update appeared to succeed but verification failed"
                        )

                except Exception as update_error:
                    logger.error(f"Update failed: {update_error}")
                    raise
            else:
                api_config_service.create([key_info])

        except Exception as e:
            logger.error(f"Could not store key info in app_config: {str(e)}")
            raise
