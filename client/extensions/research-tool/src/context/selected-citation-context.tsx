import * as React from "react";

const SelectedCitationContext = React.createContext<{
  citation: any;
  setCitation: React.Dispatch<React.SetStateAction<any>>;
} | null>(null);

export const useSelectedCitation = () => {
  const context = React.useContext(SelectedCitationContext);
  if (!context)
    throw new Error(
      "useSelectedCitation must be used within a SelectedCitationProvider",
    );

  return context;
};

export const SelectedCitationProvider = ({ children }: { children: any }) => {
  const [citation, setCitation] = React.useState<any>(null);

  return (
    <SelectedCitationContext.Provider value={{ citation, setCitation }}>
      {children}
    </SelectedCitationContext.Provider>
  );
};
