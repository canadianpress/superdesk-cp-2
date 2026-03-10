import * as React from "react";
import ReactMarkdown from "react-markdown";
import { IExtension, IExtensionActivationResult, IPage } from "superdesk-api";
import { GridList, Spacer } from "superdesk-ui-framework/react";
import { ListItem } from "./list-item";
import { SearchBar } from "./search-bar";
import { superdesk } from "./superdesk";
import { CitationTooltip } from "./tooltip";

const extension: IExtension = {
  activate: (superdesk) => {
    const result: IExtensionActivationResult = {
      contributions: {
        pages: [
          {
            title: superdesk.localization.gettext("Research Tool"),
            url: "/research-tool",
            component: ResearchTool,
            showSideMenu: true,
            addToSideMenu: {
              icon: "comments",
              order: 10000,
              keyBinding: "ctrl+alt+r",
            },
          },
        ],
      },
    };

    return Promise.resolve(result);
  },
};

const ResearchTool: IPage["component"] = () => {
  const { url: serverUrl } = superdesk.instance.config.server;

  const [markdownContent, setMarkdownContent] = React.useState("");
  const [citations, setCitations] = React.useState<Record<string, any>>({});
  const [query, setQuery] = React.useState("");

  const esRef = React.useRef<EventSource | null>(null);

  React.useEffect(() => () => esRef.current?.close(), []);

  const handleOnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (esRef.current) esRef.current.close();

    const es = new EventSource(
      `${serverUrl}/research_tool/stream?q=${encodeURIComponent(query)}`,
      { withCredentials: true },
    );
    esRef.current = es;
    setQuery("");

    es.addEventListener("response.output_text.delta", (event) => {
      const newNode = JSON.parse(event.data);
      const delta = newNode.response.delta;
      setMarkdownContent((prev) => prev + delta);
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
    });

    es.onerror = () => {
      es.close();
    };
  };

  return (
    <Spacer
      v
      noWrap
      gap="16"
      alignItems="center"
      style={{ width: "100%", height: "100%" }}
    >
      <Spacer
        h
        noWrap
        gap="8"
        alignItems="stretch"
        style={{ flex: 9, padding: "1rem", overflowY: "scroll" }}
      >
        <div style={{ flex: 8, overflowY: "scroll" }}>
          <ReactMarkdown components={{ a: CitationTooltip(citations) }}>
            {markdownContent}
          </ReactMarkdown>
        </div>
        <div style={{ overflowY: "scroll" }}>
          <GridList margin="0" gap="medium">
            {Object.entries(citations).map(([citation_id, citation]) => (
              <ListItem
                key={`citation-list-item-${citation_id}`}
                citation={citation}
              />
            ))}
          </GridList>
        </div>
      </Spacer>
      <form onSubmit={handleOnSubmit} style={{ flex: 1, width: "65%" }}>
        <SearchBar value={query} onChange={(v: any) => setQuery(v)} />
      </form>
    </Spacer>
  );
};

export default extension;
