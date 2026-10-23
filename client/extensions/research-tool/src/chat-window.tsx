import * as React from "react";
import { useSelectedChat } from "./context/selected-chat-context";
import { MessageList } from "./message-list";

export const ChatWindow = () => {
  const { chat } = useSelectedChat();

  const messages = chat?.messages ?? [];

  const chatWindowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = chatWindowRef.current;
    if (!container) return;

    const scrollThreshold = 500;
    const shouldScroll =
      messages?.[messages.length - 1]?.value === "" ||
      container.scrollHeight - container.scrollTop <=
        container.clientHeight + scrollThreshold;
    if (shouldScroll)
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
  }, [messages]);

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
          width: "65%",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <MessageList />
      </div>
    </>
  );
};
