import * as React from "react";

const CitationsContext = React.createContext<{
  citations: Record<string, any>;
  setCitations: React.Dispatch<React.SetStateAction<Record<string, any>>>;
} | null>(null);

export const useCitations = () => {
  const context = React.useContext(CitationsContext);
  if (!context)
    throw new Error("useCitations must be used within a CitationsProvider");

  return context;
};

export const CitationsProvider = ({ children }: { children: any }) => {
  const [citations, setCitations] = React.useState({});

  return (
    <CitationsContext.Provider value={{ citations, setCitations }}>
      {children}
    </CitationsContext.Provider>
  );
};
