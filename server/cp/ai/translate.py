import logging
from typing import Dict, List, Literal, Mapping, Optional, TypedDict, Union, overload
from google.oauth2 import service_account
from google.auth.transport.requests import Request
import requests
from superdesk.text_checkers.ai.base import AIServiceBase

logger = logging.getLogger(__name__)

ResponseType = Mapping[str, Union[str, List[str]]]


class TranslateData(TypedDict):
    guid: str
    source_language: str
    target_language: str
    translation_type: str
    payload: Dict[str, str]


class Translate(AIServiceBase):
    name = "translate"
    label = "Translation service"

    TRANSLATION_TYPE_BASIC = "basic"
    TRANSLATION_TYPE_ADVANCED_NMT = "advanced_nmt"
    TRANSLATION_TYPE_ADVANCED_LLM = "advanced_llm"
    TRANSLATION_TYPE_ADAPTIVE = "adaptive"
    TRANSLATION_TYPE_DEEPL = "deepl"

    def __init__(self, app):
        self.GOOGLE_API_KEY = app.config.get("GOOGLE_API_KEY")
        self.GOOGLE_API_URL = app.config.get("GOOGLE_API_URL")
        self.GOOGLE_PROJECT_ID = app.config.get("GOOGLE_PROJECT_ID")
        self.GOOGLE_PROJECT_LOCATION = app.config.get("GOOGLE_PROJECT_LOCATION")
        self.GOOGLE_SERVICE_ACCOUNT_PATH = app.config.get("GOOGLE_SERVICE_ACCOUNT_PATH")
        
        self.DEEPL_AUTH_KEY = app.config.get("DEEPL_AUTH_KEY")
        self.DEEPL_API_URL = app.config.get("DEEPL_API_URL")

        self.parent = f"projects/{self.GOOGLE_PROJECT_ID}/locations/{self.GOOGLE_PROJECT_LOCATION}"
        self.model_path = f"{self.parent}/models/general"
        self.credentials = service_account.Credentials.from_service_account_file(
            self.GOOGLE_SERVICE_ACCOUNT_PATH,
            scopes=app.config.get("GOOGLE_SCOPES"),
        )

    def translate(self, item: TranslateData) -> ResponseType:
        try:
            self.validate_request_data(item)
            translation_type = item.get("translation_type", "basic")
            translator = self.get_translator(translation_type)
            return translator(item)
        except Exception as e:
            self.handle_error(e, "Translation")

    def get_translator(self, translation_type):
        if translation_type == self.TRANSLATION_TYPE_BASIC:
            return self.translate_basic
        elif translation_type in {
            self.TRANSLATION_TYPE_ADVANCED_NMT,
            self.TRANSLATION_TYPE_ADVANCED_LLM,
        }:
            return self.translate_advanced
        elif translation_type == self.TRANSLATION_TYPE_ADAPTIVE:
            return self.translate_adaptive
        elif translation_type == self.TRANSLATION_TYPE_DEEPL:
            return self.translate_deepl
        else:
            return self.translate_basic

    def translate_basic(self, item: TranslateData) -> ResponseType:
        try:
            texts = self._extract_texts_to_translate(item)
            if self.credentials.expired or self.credentials.token is None:
                self.credentials.refresh(Request())
            url = f"{self.GOOGLE_API_URL}/v2"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.credentials.token}",
                "x-goog-user-project": self.GOOGLE_PROJECT_ID,
            }
            payload = {
                "q": texts,
                "target": item["target_language"],
                "source": item["source_language"],
                "format": "html" if any("<" in text for text in texts) else "text",
            }

            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            response_data = response.json()

            return self._prepare_translated_payload(
                item,
                response_data["data"]["translations"],
                translation_key="translatedText",
            )
        except Exception as e:
            self.handle_error(e, "Basic translation")

    def translate_advanced(self, item: TranslateData) -> ResponseType:
        try:
            texts = self._extract_texts_to_translate(item)
            if self.credentials.expired or self.credentials.token is None:
                self.credentials.refresh(Request())

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.credentials.token}",
            }
            payload = {
                "contents": texts,
                "targetLanguageCode": item["target_language"],
                "sourceLanguageCode": item["source_language"],
                "model": self._get_model_path(item["translation_type"]),
            }

            url = f"https://translate.googleapis.com/v3/{self.parent}:translateText"

            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()

            translations = response.json().get("translations", [])
            return self._prepare_translated_payload(
                item, translations, translation_key="translatedText"
            )
        except Exception as e:
            self.handle_error(e, "Advanced translation")

    def translate_adaptive(self, item: TranslateData) -> ResponseType:
        pass

    def translate_deepl(self, item: TranslateData) -> ResponseType:
        texts = self._join_texts(item)
        try:
            headers = {
                "Authorization": f"DeepL-Auth-Key {self.DEEPL_AUTH_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "YourApp/1.2.3",
            }
            payload = {
                "text": [texts],
                "target_lang": item["target_language"],
                "source_lang": item["source_language"],
            }

            response = requests.post(self.DEEPL_API_URL, headers=headers, json=payload)
            response.raise_for_status()

            return self._prepare_translated_payload_deepl(item, response)
        except Exception as e:
            raise Exception(f"Deepl translation failed: {str(e)}")

    def handle_error(self, e: Exception, context: str):
        logger.error(f"{context} failed: {str(e)}")
        return f"{context} failed: {str(e)}"

    def _join_texts(self, item: TranslateData) -> str:
        separator = "|||||"
        texts = separator.join(item["payload"].values())
        return texts

    def _prepare_translated_payload_deepl(self, data, result):
        try:
            separator = "|||||"
            translated_text = result.text
            translated_texts = translated_text.split(separator)
            translated_payload = {
                key: translation
                for key, translation in zip(data["payload"].keys(), translated_texts)
            }
            return {"translated_payload": translated_payload, **data}
        except Exception as e:
            raise Exception(f"Error preparing translated payload: {str(e)}")

    def _get_model_path(self, translation_type):
        if translation_type == "advanced_nmt":
            return self.model_path + "/nmt"
        elif translation_type == "advanced_llm":
            return self.model_path + "/translation-llm"
        else:
            raise ValueError("Invalid translation type for advanced translation")

    @overload
    def data_operation(
        self,
        verb: str,
        operation: Literal["translate"],
        name: Optional[str],
        data: TranslateData,
    ) -> ResponseType: ...

    def data_operation(
        self,
        verb: str,
        operation: Literal["translate"],
        name: Optional[str],
        data: TranslateData,
    ) -> ResponseType:
        if operation == "translate":
            return self.translate(data)

    def validate_request_data(self, data):
        if not data:
            raise Exception("No data provided")

        required_fields = [
            "translation_type",
            "source_language",
            "target_language",
            "payload",
        ]
        for field in required_fields:
            if field not in data:
                raise Exception(f"Missing required field: {field}")

        valid_translation_types = [
            "basic",
            "advanced_nmt",
            "advanced_llm",
            "adaptive",
            "deepl",
        ]

        if data["translation_type"] not in valid_translation_types:
            raise Exception("Translation Type not valid")
        translate_fields = [k for k in data["payload"].keys()]
        if not translate_fields:
            raise Exception("No fields to translate inside payload")

    def _extract_texts_to_translate(self, item: TranslateData) -> List[str]:
        return [item["payload"][k] for k in item["payload"]]

    def _prepare_translated_payload(
        self, data, translations, translation_key="translatedText"
    ):

        translated_payload = {
            key: (
                getattr(translation, translation_key)
                if hasattr(translation, translation_key)
                else translation[translation_key]
            )
            for key, translation in zip(data["payload"].keys(), translations)
        }
        return {"translated_payload": translated_payload, **data}


def init_app(app):
    return Translate(app)
