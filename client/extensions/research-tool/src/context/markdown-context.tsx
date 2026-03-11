import * as React from "react";

const MarkdownContext = React.createContext<{
  markdown: Array<string>;
  setMarkdown: React.Dispatch<React.SetStateAction<Array<string>>>;
} | null>(null);

export const useMarkdown = () => {
  const context = React.useContext(MarkdownContext);
  if (!context)
    throw new Error("useMarkdown must be used within a MarkdownProvider");

  return context;
};

export const MarkdownProvider = ({ children }: { children: any }) => {
  const [markdown, setMarkdown] = React.useState<Array<string>>([]);

  return (
    <MarkdownContext.Provider value={{ markdown, setMarkdown }}>
      {children}
    </MarkdownContext.Provider>
  );
};
