import * as React from "react";

const SelectedCitationsContext = React.createContext<{
  citations: Record<string, any>;
  addCitation: (citation: any) => void;
  removeCitation: (id: any) => void;
} | null>(null);

export const useSelectedCitations = () => {
  const context = React.useContext(SelectedCitationsContext);
  if (!context)
    throw new Error(
      "useSelectedCitations must be used within a SelectedCitationsProvider",
    );

  return context;
};

export const SelectedCitationsProvider = ({ children }: { children: any }) => {
  const [citations, setCitations] = React.useState<Record<string, any>>({});

  const addCitation = (citation: any) => {
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
