import * as React from "react";
import { ContentListItem, IconButton } from "superdesk-ui-framework/react";
import { useSelectedChat } from "./context/selected-chat-context";
import { superdesk } from "./superdesk";
import type { Chat } from "./typings/chat";

const getBaseContentListItem = (
  chat: Chat,
  setSelectedChat: ReturnType<typeof useSelectedChat>["setSelectedChat"],
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
  onClick: () => {
    setSelectedChat(chat.id);
  },
});

export const ChatListItem = ({ chat }: { chat: Chat }) => {
  const { chat: selectedChat, setSelectedChat } = useSelectedChat();

  return (
    <ContentListItem
      {...getBaseContentListItem(chat, setSelectedChat)}
      selected={chat.id === selectedChat?.id}
    />
  );
};
