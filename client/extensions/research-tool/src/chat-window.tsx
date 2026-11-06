import * as React from "react";
import { useSelectedChat } from "./context/selected-chat-context";
import { MessageList } from "./message-list";

const REPIN_AT = 4;
const UNPIN_AT = 40;

export const ChatWindow = () => {
  const { chat } = useSelectedChat();

  const messages = chat?.messages ?? [];

  const chatWindowRef = React.useRef<HTMLDivElement>(null);

  const stickToBottomRef = React.useRef(true);

  React.useEffect(() => {
    const container = chatWindowRef.current;
    if (!container) return;

    const onScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom > UNPIN_AT) stickToBottomRef.current = false;
      else if (distanceFromBottom <= REPIN_AT) stickToBottomRef.current = true;
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const container = chatWindowRef.current;
    if (!container) return;
    if (!stickToBottomRef.current) return;

    container.scrollTop = container.scrollHeight;
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
