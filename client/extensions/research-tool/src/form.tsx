import * as React from "react";
// import { SearchBar } from "./search-bar";
import { SearchBar } from "superdesk-ui-framework/react";
import { useChatsActions } from "./context/chats-context";
import { useSelectedChat } from "./context/selected-chat-context";
import { superdesk } from "./superdesk";

export const Form = () => {
  const { url: serverUrl } = superdesk.instance.config.server;

  const { chat, setSelectedChat } = useSelectedChat();
  const { addChat, addMessages, addCitations, updateChat } = useChatsActions();

  const [query, setQuery] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);

  const esRef = React.useRef<EventSource | null>(null);

  React.useEffect(() => () => esRef.current?.close(), []);

  const handleOnSubmit = (newQuery: string) => {
    if (isStreaming || !newQuery) return;
    if (esRef.current) esRef.current.close();

    setQuery(newQuery);
    setTimeout(() => {
      setQuery("");
    });
    setIsStreaming(true);

    const chatId = chat?.id ?? crypto.randomUUID();
    if (!chat?.id) {
      addChat(chatId, newQuery);
      setSelectedChat(chatId);
    } else if (!chat?.title) {
      updateChat(chatId, { title: newQuery });
    }

    addMessages(chatId, [{ type: "QUERY", value: newQuery }]);
    startStream(chatId, newQuery);
  };

  const startStream = (chatId: string, query: string) => {
    const es = new EventSource(
      `${serverUrl}/research_tool/stream?q=${encodeURIComponent(query)}`,
      { withCredentials: true },
    );
    esRef.current = es;

    es.addEventListener("response.output_text.delta", (event) => {
      const newNode = JSON.parse(event.data);
      const delta = newNode.response.delta;
      addMessages(chatId, [{ type: "RESPONSE", value: delta }]);
    });

    es.addEventListener("response.citation", (event) => {
      const newNode = JSON.parse(event.data);
      addCitations(chatId, { [`${newNode.citation_id}`]: newNode });
    });

    es.addEventListener("done", () => {
      es.close();
      setIsStreaming(false);
    });

    es.onerror = () => {
      es.close();
      setIsStreaming(false);
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
