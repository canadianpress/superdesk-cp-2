import * as React from "react";

export type Markdown = { query: string; value: string };

const MarkdownContext = React.createContext<{
  markdown: Array<Markdown>;
  setMarkdown: React.Dispatch<React.SetStateAction<Array<Markdown>>>;
} | null>(null);

export const useMarkdown = () => {
  const context = React.useContext(MarkdownContext);
  if (!context)
    throw new Error("useMarkdown must be used within a MarkdownProvider");

  return context;
};

export const MarkdownProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [markdown, setMarkdown] = React.useState<Array<Markdown>>([]);

  return (
    <MarkdownContext.Provider value={{ markdown, setMarkdown }}>
      {children}
    </MarkdownContext.Provider>
  );
};
