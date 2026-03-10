import * as React from "react";
import ReactMarkdown from "react-markdown";
import { IExtension, IExtensionActivationResult, IPage } from "superdesk-api";
import { Input, Label, WithPopover } from "superdesk-ui-framework/react";
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
  const [citations, setCitations] = React.useState<Array<any>>([]);
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
      const delta = newNode.guid;
      setCitations((prev) => [...prev, delta]);
    });

    es.addEventListener("done", () => {
      es.close();
    });

    es.onerror = () => {
      es.close();
    };
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div style={{ flex: 9, display: "flex" }}>
        <div style={{ flex: 8 }}>
          <ReactMarkdown components={{ a: CitationTooltip }}>
            {markdownContent}
          </ReactMarkdown>
        </div>
        <div style={{ flex: 2 }}>
          {citations.map((citation) => (
            <div>{citation}</div>
          ))}
        </div>
      </div>
      <form onSubmit={handleOnSubmit} style={{ flex: 1 }}>
        <Input type="text" value={query} onChange={(v) => setQuery(v)} />
      </form>
    </div>
  );
};

const CitationTooltip = ({ href, children }: any) => {
  const citationId = children.join("");
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const closeTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleClose = (closePopup?: () => void) => {
    closeTimeoutRef.current = setTimeout(() => {
      if (popoverRef.current && triggerRef.current) {
        const mouseOverTrigger = triggerRef.current.matches(":hover");
        const mouseOverPopover = popoverRef.current.matches(":hover");
        if (!mouseOverTrigger && !mouseOverPopover) {
          closePopup?.();
        }
      }
    }, 50);
  };

  return (
    <WithPopover
      placement="auto"
      component={({ closePopup }) => (
        <div
          ref={popoverRef}
          className="sd-popover"
          onMouseEnter={() => {
            clearTimeout(closeTimeoutRef.current);
          }}
          onMouseLeave={() => {
            handleClose(closePopup);
          }}
        >
          <div className="sd-popover__header">
            <h4 className="sd-popover__title" tabIndex={0} id="popoverTitle">
              {citationId}
            </h4>
          </div>
          <div className="sd-popover__content">
            <a href={href}>{href}</a>
          </div>
        </div>
      )}
    >
      {(toggle) => (
        <span
          ref={triggerRef}
          onMouseEnter={() => {
            clearTimeout(closeTimeoutRef.current);
            toggle(triggerRef.current!);
          }}
          onMouseLeave={() => {
            handleClose(() => toggle(triggerRef.current!));
          }}
        >
          <Label text={citationId} type="primary" style="hollow" />
        </span>
      )}
    </WithPopover>
  );
};

export default extension;
