import * as React from "react";
import ReactMarkdown from "react-markdown";
import { IExtension, IExtensionActivationResult, IPage } from "superdesk-api";
import { Input } from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

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
  const [status, setStatus] = React.useState("Awaiting input");
  const [query, setQuery] = React.useState("");

  const esRef = React.useRef<EventSource | null>(null);

  React.useEffect(() => () => esRef.current?.close(), []);

  const handleOnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (esRef.current) esRef.current.close();

    setStatus("Connecting...");

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

    es.addEventListener("done", () => {
      es.close();
      setStatus("Finished");
    });

    es.onerror = () => {
      es.close();
      setStatus("Error");
    };
  };

  return (
    <div>
      <p>
        <strong>Status:</strong> {status}
      </p>
      <div>
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>

      <form onSubmit={handleOnSubmit}>
        <Input type="text" value={query} onChange={(v) => setQuery(v)} />
      </form>
    </div>
  );
};

export default extension;
