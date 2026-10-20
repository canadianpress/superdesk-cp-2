import * as React from "react";
import {
  Card,
  SpacerBlock as SuperdeskSpacerBlock,
} from "superdesk-ui-framework/react";
import { useChatActions } from "./context/chat-actions-context";
import { useSelectedChat } from "./context/selected-chat-context";
import type { MessageAction } from "./message-item";
import { MessageItem } from "./message-item";
import { superdesk } from "./superdesk";

const SpacerBlock = () => {
  return (
    <span style={{ flexShrink: 0 }}>
      <SuperdeskSpacerBlock v gap="32" />
    </span>
  );
};

const getMessageActions = (
  value: string | undefined,
  onRegenerate?: () => void,
): MessageAction[] => [
  ...(value
    ? [
        {
          id: "copy" as const,
          icon: "copy",
          label: superdesk.localization.gettext("Copy"),
          onClick: () => {
            navigator.clipboard
              .writeText(value)
              .then(() => {
                superdesk.ui.notify.success(
                  superdesk.localization.gettext("Copied to clipboard"),
                );
              })
              .catch(() => {
                superdesk.ui.notify.error(
                  superdesk.localization.gettext("Could not copy to clipboard"),
                );
              });
          },
        },
      ]
    : []),
  ...(onRegenerate
    ? [
        {
          id: "regenerate" as const,
          icon: "redo",
          label: superdesk.localization.gettext("Regenerate"),
          onClick: onRegenerate,
        },
      ]
    : []),
];

export const MessageList = () => {
  const { chat } = useSelectedChat();
  const { retryLastQuery } = useChatActions();
  if (!chat) return null;

  const { messages } = chat;

  const baseCardStyles = {
    width: "fit-content",
    marginLeft: "auto",
  };

  return (
    <>
      {messages.map((message, i) => {
        const canRegenerate = i === messages.length - 1 && chat.hasError;
        const actions = getMessageActions(
          message.type === "RESPONSE" ? message.value : undefined,
          canRegenerate ? retryLastQuery : undefined,
        );

        return (
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
              <MessageItem markdown={message.value} actions={actions} />
            )}
            <SpacerBlock />
          </React.Fragment>
        );
      })}
    </>
  );
};
