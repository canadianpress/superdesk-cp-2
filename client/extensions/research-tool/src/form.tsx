import * as React from "react";
import { useCitations } from "./context/citations-context";
import { useMarkdown } from "./context/markdown-context";
import { SearchBar } from "./search-bar";
import { superdesk } from "./superdesk";

export const Form = () => {
  const { url: serverUrl } = superdesk.instance.config.server;

  const { setMarkdown } = useMarkdown();
  const { setCitations } = useCitations();

  const [query, setQuery] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);

  const esRef = React.useRef<EventSource | null>(null);

  React.useEffect(() => () => esRef.current?.close(), []);

  const handleOnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming) return;
    if (esRef.current) esRef.current.close();

    setIsStreaming(true);
    setQuery("");
    setMarkdown((prev) => [...prev, ""]);

    const es = new EventSource(
      `${serverUrl}/research_tool/stream?q=${encodeURIComponent(query)}`,
      { withCredentials: true },
    );
    esRef.current = es;

    es.addEventListener("response.output_text.delta", (event) => {
      const newNode = JSON.parse(event.data);
      const delta = newNode.response.delta;
      setMarkdown((prev) => {
        const updated = [...prev];
        const last = prev.length - 1;
        updated[last] = updated[last] + delta;
        return updated;
      });
    });

    es.addEventListener("response.citation", (event) => {
      const newNode = JSON.parse(event.data);
      setCitations((prev) => ({
        ...prev,
        [`${newNode.citation_id}`]: newNode,
      }));
    });

    es.addEventListener("done", () => {
      es.close();
      setIsStreaming(false);
    });

    es.onerror = () => {
      es.close();
      setIsStreaming(false);
    };
  };

  return (
    <form onSubmit={handleOnSubmit} style={{ flex: 1, width: "65%" }}>
      <SearchBar value={query} onChange={(v: any) => setQuery(v)} />
    </form>
  );
};
