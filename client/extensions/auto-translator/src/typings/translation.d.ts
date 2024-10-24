import { TRANSLATION_METHODS } from "../utilities";

type TranslationFields = "headline" | "headline_extended" | "body_html";

type TranslationType = keyof typeof TRANSLATION_METHODS;

export type TranslationPayload = {
  body_html: "";
  payload: Record<TranslationFields, string>;
  target_language: string;
  source_language: string;
  translation_type: TranslationType;
};

export type TranslationResponse = {
  _updated: string;
  _created: string;
  _etag: string;
  analysis: {
    translated_payload: Record<TranslationFields, string>;
    body_html: "";
    payload: Record<TranslationFields, string>;
    target_language: string;
    source_language: string;
    translation_type: TranslationType;
  };
  _id: number;
  _links: {
    self: {
      title: string;
      href: string;
    };
  };
  _status: string;
};
