import * as React from "react";
import {
  IconButton,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelHeader,
  Menu as SuperdeskMenu,
} from "superdesk-ui-framework/react";
import { CitationDetails, getMenuItems } from "./citation-details";
import { CitationList } from "./citation-list";
import { useSelectedCitation } from "./context/selected-citation-context";
import {
  SelectedCitationsProvider,
  useSelectedCitations,
} from "./context/selected-citations-context";
import { superdesk } from "./superdesk";

export const CitationWindow = () => {
  const { setCitation } = useSelectedCitation();

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
        <SelectedCitationsProvider>
          <PanelHeader
            title={superdesk.localization.gettext("Citations")}
            onClose={() => {
              setCitation(null);
              setIsOpen((prev) => !prev);
            }}
            iconButtons={[<Menu />]}
          />
          <PanelContent>
            <PanelContentBlock padding="1-5">
              <CitationList />
            </PanelContentBlock>
          </PanelContent>
        </SelectedCitationsProvider>
      </Panel>
      <CitationDetails />
    </>
  );
};

const Menu = () => {
  const { citations } = useSelectedCitations();

  return (
    <SuperdeskMenu items={getMenuItems(Object.values(citations))}>
      {(toggle) => (
        <IconButton
          icon="dots-vertical"
          ariaValue={superdesk.localization.gettext("Actions")}
          onClick={toggle}
        />
      )}
    </SuperdeskMenu>
  );
};
