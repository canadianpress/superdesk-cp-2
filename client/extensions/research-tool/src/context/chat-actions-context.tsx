import * as React from "react";
import { extractGuidFromUrl } from "../guid";
import { superdesk } from "../superdesk";
import type { Citation } from "../typings/chat";
import { useChatsActions } from "./chats-context";
import { useSelectedChat } from "./selected-chat-context";

const ChatActionsContext = React.createContext<{
  submitQuery: (query: string) => boolean;
  retryLastQuery: () => void;
} | null>(null);

export const useChatActions = () => {
  const context = React.useContext(ChatActionsContext);
  if (!context)
    throw new Error("useChatActions must be used within a ChatActionsProvider");

  return context;
};

const normalizeCitation = ({ snippets, ...citation }: Citation): Citation => ({
  ...citation,
  snippets: snippets ?? [],
  content_types: citation.content_types ?? [],
});

export const ChatActionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { url: serverUrl } = superdesk.instance.config.server;
  const { chat, setSelectedChat } = useSelectedChat();
  const chatRef = React.useRef(chat);
  chatRef.current = chat;
  const { addChat, addMessages, addCitations, updateChat, remapChat } =
    useChatsActions();
  const chatStreamsRef = React.useRef<Map<string, EventSource>>(new Map());

  React.useEffect(
    () => () => {
      chatStreamsRef.current.forEach((eventSource) => eventSource.close());
      chatStreamsRef.current.clear();
    },
    [],
  );

  const startStream = React.useCallback(
    (newChatId: string, query: string) => {
      let chatId = newChatId;
      const eventSource = new EventSource(
        `${serverUrl}/research_tool/stream?q=${encodeURIComponent(query)}&chat_id=${encodeURIComponent(newChatId)}`,
        { withCredentials: true },
      );
      chatStreamsRef.current.set(chatId, eventSource);
      updateChat(chatId, { isStreaming: true, hasError: false });

      eventSource.addEventListener("chat.id", (event) => {
        const data = JSON.parse(event.data);
        const serverChatId = data.value;
        if (chatId === serverChatId) return;

        remapChat(chatId, serverChatId);
        setSelectedChat(serverChatId);
        chatStreamsRef.current.set(serverChatId, eventSource);
        chatStreamsRef.current.delete(chatId);
        chatId = serverChatId;
      });

      eventSource.addEventListener("response.output_text.delta", (event) => {
        const newNode = JSON.parse(event.data);
        addMessages(chatId, [
          { type: "RESPONSE", value: newNode.response.delta },
        ]);
      });

      eventSource.addEventListener("response.citation", (event) => {
        const newNode = JSON.parse(event.data);
        const id = extractGuidFromUrl(newNode.uri) ?? newNode.citation_id;
        addCitations(chatId, { [id]: normalizeCitation(newNode) });
      });

      const closeStream = (hasError: boolean) => {
        eventSource.close();
        chatStreamsRef.current.delete(chatId);
        updateChat(chatId, { isStreaming: false, hasError });
      };

      eventSource.addEventListener("response.done", () => closeStream(false));
      eventSource.onerror = (e) => {console.log({e}); closeStream(true)};
    },
    [
      addCitations,
      addMessages,
      remapChat,
      serverUrl,
      setSelectedChat,
      updateChat,
    ],
  );

  const submitQuery = React.useCallback(
    (query: string) => {
      if (!query) return false;

      const selectedChat = chatRef.current;
      const chatId = selectedChat?.id ?? crypto.randomUUID();
      if (chatStreamsRef.current.has(chatId)) return false;

      if (!selectedChat?.id) {
        addChat(chatId, query);
        setSelectedChat(chatId);
      } else if (!selectedChat.title) {
        updateChat(chatId, { title: query });
      }

      addMessages(chatId, [{ type: "QUERY", value: query }]);
      startStream(chatId, query);
      return true;
    },
    [addChat, addMessages, setSelectedChat, startStream, updateChat],
  );

  const retryLastQuery = React.useCallback(() => {
    const lastQuery = chatRef.current?.messages
      .slice()
      .reverse()
      .find((message) => message.type === "QUERY");

    if (lastQuery) submitQuery(lastQuery.value);
  }, [submitQuery]);

  const value = React.useMemo(
    () => ({ submitQuery, retryLastQuery }),
    [retryLastQuery, submitQuery],
  );

  return (
    <ChatActionsContext.Provider value={value}>
      {children}
    </ChatActionsContext.Provider>
  );
};
