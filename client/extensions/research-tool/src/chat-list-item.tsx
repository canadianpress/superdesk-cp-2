import * as React from "react";
import { ContentListItem, IconButton } from "superdesk-ui-framework/react";
import { useChatsActions } from "./context/chats-context";
import { useSelectedChat } from "./context/selected-chat-context";
import { extractGuidFromUrl } from "./guid";
import { superdesk } from "./superdesk";
import type { ApiChat, FormChat } from "./typings/chat";

const fetchChat = async (
  id: string,
  {
    updateChat,
  }: { updateChat: ReturnType<typeof useChatsActions>["updateChat"] },
) => {
  const { url: serverUrl } = superdesk.instance.config.server;

  try {
    const res = await fetch(`${serverUrl}/research_tool/chat/${id}`, {
      credentials: "include",
    });
    if (!res.ok) return;

    const { messages } = await res.json();
    if (!Array.isArray(messages)) return;

    const chat = messages.reduce<Pick<FormChat, "messages" | "citations">>(
      (chat, { type, value, citations }: ApiChat["messages"][number]) => {
        chat.messages.push({ type, value });
        for (const citation of citations ?? []) {
          const id = extractGuidFromUrl(citation.uri) ?? citation.citation_id;
          chat.citations[id] = citation;
        }
        return chat;
      },
      { messages: [], citations: {} },
    );
    updateChat(id, chat);
  } catch (err) {
    console.error("Failed to fetch chat", err);
  }
};

const getBaseContentListItem = (
  chat: FormChat,
  {
    setSelectedChat,
    updateChat,
  }: {
    setSelectedChat: ReturnType<typeof useSelectedChat>["setSelectedChat"];
    updateChat: ReturnType<typeof useChatsActions>["updateChat"];
  },
) => ({
  itemColum: [
    { itemRow: [{ content: <div>{chat.title}</div> }], fullwidth: true },
  ],
  action: (
    <IconButton
      icon="dots-vertical"
      ariaValue={superdesk.localization.gettext("Actions")}
      onClick={() => {}}
    />
  ),
  onClick: async () => {
    if (!chat.isStreaming) await fetchChat(chat.id, { updateChat });
    setSelectedChat(chat.id);
  },
});

export const ChatListItem = ({ chat }: { chat: FormChat }) => {
  const { chat: selectedChat, setSelectedChat } = useSelectedChat();
  const { updateChat } = useChatsActions();

  return (
    <ContentListItem
      {...getBaseContentListItem(chat, { setSelectedChat, updateChat })}
      selected={chat.id === selectedChat?.id}
    />
  );
};
