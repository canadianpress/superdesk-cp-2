import * as React from "react";
import {
  IconButton,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelHeader,
  Rotate,
} from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

export const ChatList = () => {
  const [isOpen, setIsOpen] = React.useState(false);

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
        />
        <PanelContent>
          <PanelContentBlock padding="1-5"></PanelContentBlock>
        </PanelContent>
      </Panel>
    </>
  );
};
