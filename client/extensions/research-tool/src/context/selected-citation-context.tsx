import * as React from "react";
import type { Citation } from "../typings/chat";
import { useCitations } from "./citations-context";

const SelectedCitationContext = React.createContext<{
  citation: Citation | null;
  setSelectedCitation: (id: string | null) => void;
} | null>(null);

export const useSelectedCitation = () => {
  const context = React.useContext(SelectedCitationContext);
  if (!context)
    throw new Error(
      "useSelectedCitation must be used within a SelectedCitationProvider",
    );

  return context;
};

export const SelectedCitationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const citations = useCitations();

  const [selectedCitation, setSelectedCitation] = React.useState<string | null>(
    null,
  );

  const citation = React.useMemo(() => {
    if (!selectedCitation) return null;
    return citations[selectedCitation];
  }, [citations, selectedCitation]);

  return (
    <SelectedCitationContext.Provider value={{ citation, setSelectedCitation }}>
      {children}
    </SelectedCitationContext.Provider>
  );
};
