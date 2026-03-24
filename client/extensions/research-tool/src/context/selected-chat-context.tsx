import * as React from "react";
import type { Chat } from "../typings/chat";
import { useChats } from "./chats-context";

const SelectedChatContext = React.createContext<{
  chat: Chat | null;
  setSelectedChat: (id: string) => void;
} | null>(null);

export const useSelectedChat = () => {
  const context = React.useContext(SelectedChatContext);
  if (!context)
    throw new Error(
      "useSelectedChat must be used within a SelectedChatProvider",
    );

  return context;
};

export const SelectedChatProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const chats = useChats();

  const [selectedChat, setSelectedChat] = React.useState<string | null>(null);

  const chat = React.useMemo(() => {
    if (!selectedChat) return null;
    return chats[selectedChat];
  }, [chats, selectedChat]);

  return (
    <SelectedChatContext.Provider value={{ chat, setSelectedChat }}>
      {children}
    </SelectedChatContext.Provider>
  );
};
