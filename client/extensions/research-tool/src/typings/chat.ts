export type Message = { type: "QUERY" | "RESPONSE"; value: string };

export type Citation = {
  citation_id: string;
  uri: string;
  slugline: string;
  headline: string;
  snippets: Array<string>;
  date_published: string;
  language: string;
  source: string;
  content_types: Array<string>;
  article?: Article;
};

export type Chat = {
  id: string;
  title: string;
  messages: Array<Message>;
  citations: Record<string, Citation>;
  updated: string;
};

export type ApiChat = {
  _id: string;
  _updated: string;
  chat_id: string;
  chat_title: string;
  messages: Array<Message & { created: string; citations?: Array<Citation> }>;
};

export type FormChat = Chat & { isStreaming: boolean; hasError: boolean };

export type Article = {
  guid: string;
  type: string;
  headline: string;
  headline_extended: string;
  headline_main: string;
  description_text: string;
  versioncreated: string;
  slugline: string;
  firstcreated: string;
  urgency: number;
  version: string;
  body_html: string;
  source: string;
  state: string;
  language: string;
  byline: string;
  located: string;
  word_count: number;
  sign_off: unknown;
  dateline: {
    text: string;
  };
};
