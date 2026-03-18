import * as React from "react";

export type Citation = {
  citation_id: string;
  uri: string;
  slugline: string;
  headline: string;
  description: string;
  date_published: string;
  language: string;
  source: string;
  type: string;
};

export type Citations = Record<string, Citation>;

const CitationsContext = React.createContext<{
  citations: Citations;
  setCitations: React.Dispatch<React.SetStateAction<Citations>>;
} | null>(null);

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
  const [citations, setCitations] = React.useState({});

  return (
    <CitationsContext.Provider value={{ citations, setCitations }}>
      {children}
    </CitationsContext.Provider>
  );
};
