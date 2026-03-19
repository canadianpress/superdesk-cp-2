import * as React from "react";
import type { Citation } from "./citations-context";

const SelectedCitationContext = React.createContext<{
  citation: Citation | null;
  setCitation: React.Dispatch<React.SetStateAction<Citation | null>>;
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
  const [citation, setCitation] = React.useState<Citation | null>(null);

  return (
    <SelectedCitationContext.Provider value={{ citation, setCitation }}>
      {children}
    </SelectedCitationContext.Provider>
  );
};
