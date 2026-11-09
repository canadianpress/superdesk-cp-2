import { extractGuidFromUrl } from "./guid";
import { ApiChat, FormChat } from "./typings/chat";

export const toFormChat = ({
  chat_id,
  chat_title,
  _updated,
  shared,
  messages,
}: Partial<ApiChat>): Partial<FormChat> => ({
  ...(chat_id && { id: chat_id }),
  ...(chat_title && { title: chat_title }),
  ...(_updated && { updated: _updated }),
  ...(shared && { readonly: shared }),
  isStreaming: false,
  hasError: false,
  ...(messages || []).reduce<Pick<FormChat, "messages" | "citations">>(
    (chat, { type, value, citations }: ApiChat["messages"][number]) => {
      chat.messages.push({ type, value });
      for (const citation of citations ?? []) {
        const id = extractGuidFromUrl(citation.uri) ?? citation.citation_id;
        chat.citations[id] = citation;
      }
      return chat;
    },
    { messages: [], citations: {} },
  ),
});
