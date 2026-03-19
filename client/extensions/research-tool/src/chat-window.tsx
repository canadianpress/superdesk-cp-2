import * as React from "react";
import { useMarkdown } from "./context/markdown-context";
import { MarkdownList } from "./markdown-list";

export const ChatWindow = () => {
  const { markdown } = useMarkdown();

  const chatWindowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = chatWindowRef.current;
    if (!container) return;

    const scrollThreshold = 500;
    const shouldScroll =
      markdown?.[markdown.length - 1]?.value === "" ||
      container.scrollHeight - container.scrollTop <=
        container.clientHeight + scrollThreshold;
    if (shouldScroll)
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
  }, [markdown]);

  return (
    <>
      <style>
        {`
          .research-tool__chat-window {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
          .research-tool__chat-window::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div
        ref={chatWindowRef}
        className="research-tool__chat-window"
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          padding: "0 2rem",
        }}
      >
        <MarkdownList />
      </div>
    </>
  );
};
