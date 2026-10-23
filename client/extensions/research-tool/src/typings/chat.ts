export type Message = { type: "QUERY" | "RESPONSE"; value: string };

export type Citation = {
  citation_id: string;
  uri: string;
  slugline: string;
  headline: string;
  description: string;
  date_published: string;
  language: string;
  source: string;
  type: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: Array<Message>;
  citations: Record<string, Citation>;
};

export type FormChat = Chat & { isStreaming: boolean };
