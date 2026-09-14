import * as React from "react";
import {
  Card,
  SpacerBlock as SuperdeskSpacerBlock,
} from "superdesk-ui-framework/react";
import { useSelectedChat } from "./context/selected-chat-context";
import { MessageItem } from "./message-item";

const SpacerBlock = () => {
  return (
    <span style={{ flexShrink: 0 }}>
      <SuperdeskSpacerBlock v gap="32" />
    </span>
  );
};

export const MessageList = () => {
  const { chat } = useSelectedChat();
  if (!chat) return null;

  const { messages } = chat;

  const baseCardStyles = {
    width: "fit-content",
    marginLeft: "auto",
  };

  return (
    <>
      {messages.map((message, i) => (
        <React.Fragment key={`markdown-${i}`}>
          {i === 0 && <SpacerBlock />}
          {message.type === "QUERY" ? (
            <Card
              paddingBase="2"
              style={
                i === 0
                  ? { ...baseCardStyles, marginTop: "auto" }
                  : baseCardStyles
              }
            >
              {message.value}
            </Card>
          ) : (
            <MessageItem markdown={message.value} />
          )}
          <SpacerBlock />
        </React.Fragment>
      ))}
    </>
  );
};
