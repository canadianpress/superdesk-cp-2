import * as React from "react";
import {
  IconButton,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelHeader,
} from "superdesk-ui-framework/react";
import { CitationList } from "./citation-list";
import { superdesk } from "./superdesk";

export const CitationWindow = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {!isOpen && (
        <div style={{ padding: "1rem" }}>
          <IconButton
            icon="expand"
            ariaValue={superdesk.localization.gettext("Show citations")}
            onClick={() => {
              setIsOpen((prev) => !prev);
            }}
          />
        </div>
      )}
      <Panel open={isOpen} side="right" background="transparent">
        <PanelHeader
          title={superdesk.localization.gettext("Citations")}
          onClose={() => {
            setIsOpen((prev) => !prev);
          }}
        />
        <PanelContent>
          <PanelContentBlock padding="1-5">
            <CitationList />
          </PanelContentBlock>
        </PanelContent>
      </Panel>
    </>
  );
};
