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

  const [selectedCitations, setSelectedCitations] = React.useState<Set<string>>(
    new Set(),
  );

  const filteredCitations = React.useMemo(() => {
    const result: Chat["citations"] = {};
    selectedCitations.forEach((id) => {
      if (citations[id]) result[id] = citations[id];
    });
    return result;
  }, [citations, selectedCitations]);

  const addCitation = (id: string) => {
    setSelectedCitations((prev) => new Set(prev).add(id));
  };

  const removeCitation = (id: string) => {
    setSelectedCitations((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <SelectedCitationsContext.Provider
      value={{ citations: filteredCitations, addCitation, removeCitation }}
    >
      {children}
    </SelectedCitationsContext.Provider>
  );
};
