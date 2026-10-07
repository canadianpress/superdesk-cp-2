import * as React from "react";
import { SearchBar } from "superdesk-ui-framework/react";
import { useChatsActions } from "./context/chats-context";
import { useSelectedChat } from "./context/selected-chat-context";
import { extractGuidFromUrl } from "./guid";
import { superdesk } from "./superdesk";
import { Citation } from "./typings/chat";

const normalizeCitation = ({ snippets, ...citation }: Citation): Citation => ({
  ...citation,
  snippets: snippets ?? [],
  content_types: citation.content_types ?? [],
});

export const Form = () => {
  const { url: serverUrl } = superdesk.instance.config.server;

  const { chat, setSelectedChat } = useSelectedChat();
  const { addChat, addMessages, addCitations, updateChat, remapChat } =
    useChatsActions();

  const [query, setQuery] = React.useState("");

  const chatStreamsRef = React.useRef<Map<string, EventSource>>(new Map());

  React.useEffect(
    () => () => {
      chatStreamsRef.current.forEach((es) => es.close());
      chatStreamsRef.current.clear();
    },
    [],
  );

  const handleOnSubmit = (newQuery: string) => {
    const chatId = chat?.id ?? crypto.randomUUID();
    if (chatStreamsRef.current.has(chatId) || !newQuery) return;

    setQuery(newQuery);
    setTimeout(() => {
      setQuery("");
    });

    if (!chat?.id) {
      addChat(chatId, newQuery);
      setSelectedChat(chatId);
    } else if (!chat?.title) {
      updateChat(chatId, { title: newQuery });
    }

    addMessages(chatId, [{ type: "QUERY", value: newQuery }]);
    startStream(chatId, newQuery);
  };

  const startStream = (newChatId: string, query: string) => {
    let chatId = newChatId;
    const es = new EventSource(
      `${serverUrl}/research_tool/stream?q=${encodeURIComponent(query)}&chat_id=${encodeURIComponent(newChatId)}`,
      { withCredentials: true },
    );
    chatStreamsRef.current.set(chatId, es);
    updateChat(chatId, { isStreaming: true });

    es.addEventListener("chat.id", (event) => {
      const data = JSON.parse(event.data);
      const serverChatId = data.value;
      if (chatId === serverChatId) return;

      remapChat(chatId, serverChatId);
      setSelectedChat(serverChatId);
      chatStreamsRef.current.set(serverChatId, es);
      chatStreamsRef.current.delete(chatId);
      chatId = serverChatId;
    });

    es.addEventListener("response.output_text.delta", (event) => {
      const newNode = JSON.parse(event.data);
      const delta = newNode.response.delta;
      addMessages(chatId, [{ type: "RESPONSE", value: delta }]);
    });

    es.addEventListener("response.citation", (event) => {
      const newNode = JSON.parse(event.data);
      const id = extractGuidFromUrl(newNode.uri) ?? newNode.citation_id;
      addCitations(chatId, { [id]: normalizeCitation(newNode) });
    });

    es.addEventListener("done", () => {
      es.close();
      chatStreamsRef.current.delete(chatId);
      updateChat(chatId, { isStreaming: false });
    });

    es.onerror = () => {
      es.close();
      chatStreamsRef.current.delete(chatId);
      updateChat(chatId, { isStreaming: false });
    };
  };

  return (
    <div style={{ width: "65%" }}>
      <SearchBar
        value={query}
        type="boxed"
        placeholder={superdesk.localization.gettext("Ask a question")}
        boxed
        onSubmit={handleOnSubmit}
      />
    </div>
  );
};
