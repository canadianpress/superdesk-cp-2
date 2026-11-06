import * as React from "react";
import { Alert } from "superdesk-ui-framework/react";
import { useSelectedChat } from "./context/selected-chat-context";
import { MessageList } from "./message-list";
import { superdesk } from "./superdesk";

const REPIN_AT = 4;
const UNPIN_AT = 40;

const SharedChatBanner = () => (
  <span style={{ alignSelf: "center", paddingTop: "1rem" }}>
    <Alert type="primary" style="hollow" size="small" margin="none">
      {superdesk.localization.gettext(
        "This is a shared chat, for reference only.",
      )}
    </Alert>
  </span>
);

export const ChatWindow = () => {
  const { chat } = useSelectedChat();

  const messages = chat?.messages ?? [];
  const readonly = chat?.readonly ?? false;

  const chatWindowRef = React.useRef<HTMLDivElement>(null);

  const stickToBottomRef = React.useRef(!readonly);

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
        {readonly && <SharedChatBanner />}
        <MessageList />
      </div>
    </>
  );
};
