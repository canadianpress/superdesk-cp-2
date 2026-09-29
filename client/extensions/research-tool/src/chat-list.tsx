import * as React from "react";
import {
  IconButton,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelHeader,
  Rotate,
  Spacer,
} from "superdesk-ui-framework/react";
import { ChatListItem } from "./chat-list-item";
import { useChats, useChatsActions } from "./context/chats-context";
import { useSelectedChat } from "./context/selected-chat-context";
import { superdesk } from "./superdesk";

export const ChatList = () => {
  const chats = useChats();
  const { addChat } = useChatsActions();
  const { setSelectedChat } = useSelectedChat();

  const [isOpen, setIsOpen] = React.useState(false);

  const addNewChat = () => {
    const chatId = crypto.randomUUID();
    addChat(chatId, "");
    setSelectedChat(chatId);
  };

  return (
    <>
      {!isOpen && (
        <div style={{ padding: "1rem" }}>
          <Rotate
            children={
              <IconButton
                icon="expand"
                ariaValue={superdesk.localization.gettext("Show chats")}
                onClick={() => {
                  setIsOpen((prev) => !prev);
                }}
              />
            }
            degrees={180}
          />
        </div>
      )}
      <Panel open={isOpen} side="left" background="transparent">
        <PanelHeader
          title={superdesk.localization.gettext("Chats")}
          onClose={() => {
            setIsOpen((prev) => !prev);
          }}
          iconButtons={[
            <IconButton
              key="chat-list-add-chat-button"
              icon="pencil"
              ariaValue={superdesk.localization.gettext("Start new chat")}
              onClick={addNewChat}
            />,
          ]}
        />
        <PanelContent>
          <PanelContentBlock padding="1-5">
            <Spacer v gap="4">
              {Object.values(chats)
                .filter((chat) => chat.title)
                .map((chat) => (
                  <ChatListItem key={`chat-list-item-${chat.id}`} chat={chat} />
                ))}
            </Spacer>
          </PanelContentBlock>
        </PanelContent>
      </Panel>
    </>
  );
};
