import * as React from "react";
import { superdesk } from "../superdesk";
import type { FormChat } from "../typings/chat";
import { useChats } from "./chats-context";

const SelectedChatContext = React.createContext<{
  chat: FormChat | null;
  setSelectedChat: (id: string | null) => void;
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

  const shareId = superdesk.browser.location.urlParams.getString("shareId");

  const [selectedChat, setSelectedChat] = React.useState<string | null>(
    shareId ?? null,
  );

  const chat = React.useMemo(() => {
    if (!selectedChat) return null;
    return chats[selectedChat] ?? null;
  }, [chats, selectedChat]);

  const value = React.useMemo(
    () => ({ chat, setSelectedChat }),
    [chat, setSelectedChat],
  );

  return (
    <SelectedChatContext.Provider value={value}>
      {children}
    </SelectedChatContext.Provider>
  );
};
