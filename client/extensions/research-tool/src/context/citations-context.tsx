import * as React from "react";
import type { Chat } from "../typings/chat";
import { useSelectedChat } from "./selected-chat-context";
import { SelectedCitationProvider } from "./selected-citation-context";
import { SelectedCitationsProvider } from "./selected-citations-context";

const CitationsContext = React.createContext<Chat["citations"] | null>(null);

export const useCitations = () => {
  const context = React.useContext(CitationsContext);
  if (!context)
    throw new Error("useCitations must be used within a CitationsProvider");

  return context;
};

export const CitationsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { chat } = useSelectedChat();

  const citations = React.useMemo(
    () => chat?.citations ?? {},
    [chat?.citations],
  );

  return (
    <CitationsContext.Provider value={citations}>
      <SelectedCitationProvider>
        <SelectedCitationsProvider>{children}</SelectedCitationsProvider>
      </SelectedCitationProvider>
    </CitationsContext.Provider>
  );
};
