import * as React from "react";
import {
  Checkbox,
  IconButton,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelHeader,
  Menu as SuperdeskMenu,
} from "superdesk-ui-framework/react";
import { CitationDetails, getMenuItems } from "./citation-details";
import { CitationList } from "./citation-list";
import { useCitations } from "./context/citations-context";
import { useSelectedCitation } from "./context/selected-citation-context";
import { useSelectedCitations } from "./context/selected-citations-context";
import { superdesk } from "./superdesk";

export const CitationWindow = () => {
  const { citation, setSelectedCitation } = useSelectedCitation();

  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (citation) setIsOpen(true);
  }, [citation]);

  return (
    <>
      {!isOpen && (
        <div style={{ padding: "1rem" }}>
          <IconButton
            icon="expand"
            ariaValue={superdesk.localization.gettext("Show citations")}
            onClick={() => {
              setIsOpen(true);
            }}
          />
        </div>
      )}
      <Panel open={isOpen} side="right" background="transparent">
        <PanelHeader
          title={superdesk.localization.gettext("Citations")}
          onClose={() => {
            setSelectedCitation(null);
            setIsOpen(false);
          }}
          iconButtons={[
            <SelectAllCheckbox key="citation-list-select-all" />,
            <Menu key="citation-list-header-menu" />,
          ]}
        />
        <PanelContent>
          <PanelContentBlock padding="1-5">
            <CitationList />
          </PanelContentBlock>
        </PanelContent>
        <CitationDetails />
      </Panel>
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

const SelectAllCheckbox = () => {
  const citations = useCitations();
  const {
    citations: selectedCitations,
    addCitations,
    removeCitations,
  } = useSelectedCitations();

  const citationsCount = Object.keys(citations).length;
  const selected =
    citationsCount > 0 &&
    citationsCount === Object.keys(selectedCitations).length;
  const ids = Object.keys(citations);

  return (
    <Checkbox
      checked={selected}
      disabled={!citationsCount}
      label={{
        text: superdesk.localization.gettext("Select all citations"),
        hidden: true,
      }}
      onChange={(value) => {
        if (value) addCitations(ids);
        else removeCitations(ids);
      }}
    />
  );
};
