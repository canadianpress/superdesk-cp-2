import * as React from "react";
import type { Chat, Citation } from "../typings/chat";

const SelectedCitationsContext = React.createContext<{
  citations: Chat["citations"];
  addCitation: (citation: Citation) => void;
  removeCitation: (id: Citation["citation_id"]) => void;
} | null>(null);

export const useSelectedCitations = () => {
  const context = React.useContext(SelectedCitationsContext);
  if (!context)
    throw new Error(
      "useSelectedCitations must be used within a SelectedCitationsProvider",
    );

  return context;
};

export const SelectedCitationsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [citations, setCitations] = React.useState<Chat["citations"]>({});

  const addCitation = (citation: Citation) => {
    setCitations((prev) => ({
      ...prev,
      [citation.citation_id]: citation,
    }));
  };

  const removeCitation = (id: string) => {
    setCitations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <SelectedCitationsContext.Provider
      value={{ citations, addCitation, removeCitation }}
    >
      {children}
    </SelectedCitationsContext.Provider>
  );
};
