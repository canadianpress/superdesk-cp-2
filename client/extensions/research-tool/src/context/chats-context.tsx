import * as React from "react";

export type Chat = {
  chat_id: string;
  uri: string;
  slugline: string;
  headline: string;
  description: string;
  date_published: string;
  language: string;
  source: string;
  type: string;
};

export type Chats = Record<string, Chat>;

const ChatsContext = React.createContext<{
  chats: Chats;
  setChats: React.Dispatch<React.SetStateAction<Chats>>;
} | null>(null);

export const useChats = () => {
  const context = React.useContext(ChatsContext);
  if (!context) throw new Error("useChats must be used within a ChatsProvider");

  return context;
};

export const ChatsProvider = ({ children }: { children: React.ReactNode }) => {
  const [chats, setChats] = React.useState({});

  return (
    <ChatsContext.Provider value={{ chats, setChats }}>
      {children}
    </ChatsContext.Provider>
  );
};
