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
    <div
      ref={chatWindowRef}
      style={{
        flex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        paddingRight: "1rem",
      }}
    >
      <MarkdownList />
    </div>
  );
};
