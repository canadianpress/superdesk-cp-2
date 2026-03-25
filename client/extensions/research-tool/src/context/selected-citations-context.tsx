import * as React from "react";
import type { Chat } from "../typings/chat";
import { useCitations } from "./citations-context";

const SelectedCitationsContext = React.createContext<{
  citations: Chat["citations"];
  addCitation: (id: string) => void;
  removeCitation: (id: string) => void;
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
  const citations = useCitations();

  const [selectedCitations, setSelectedCitations] = React.useState<
    Chat["citations"]
  >({});

  const addCitation = (id: string) => {
    setSelectedCitations((prev) => ({
      ...prev,
      [id]: citations[id],
    }));
  };

  const removeCitation = (id: string) => {
    setSelectedCitations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <SelectedCitationsContext.Provider
      value={{ citations: selectedCitations, addCitation, removeCitation }}
    >
      {children}
    </SelectedCitationsContext.Provider>
  );
};
