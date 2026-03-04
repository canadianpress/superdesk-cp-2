import * as React from "react";
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

  const [items, setItems] = React.useState<any[]>([]);
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

    es.onmessage = (event) => {
      const newNode = JSON.parse(event.data);
      setItems((prev) => [...prev, newNode]);
    };

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
      <p>Status: {status}</p>
      {items.map((item, i) => (
        <div key={i}>Iteration: {item.iteration}</div>
      ))}
      <form onSubmit={handleOnSubmit}>
        <Input
          type="text"
          value={query}
          onChange={(v) => {
            setQuery(v);
          }}
        />
      </form>
    </div>
  );
};

export default extension;
