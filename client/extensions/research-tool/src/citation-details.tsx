import * as React from "react";
import {
  IconButton,
  Menu,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelHeader,
} from "superdesk-ui-framework/react";
import { useSelectedCitation } from "./context/selected-citation-context";
import { superdesk } from "./superdesk";

const FIELDS = {
  slugline: { label: superdesk.localization.gettext("Slugline") },
  headline: { label: superdesk.localization.gettext("Headline") },
  date_published: { label: superdesk.localization.gettext("Date published") },
  language: { label: superdesk.localization.gettext("Language") },
  source: { label: superdesk.localization.gettext("Source") },
  type: { label: superdesk.localization.gettext("Type") },
} as const;

export const getMenuItems = (
  citations: Array<any>,
  extraFields?: Record<string, any>,
) => {
  const fields = { ...FIELDS, ...extraFields };

  const copyChildren = Object.entries(fields).map(([key, { label }]) => ({
    label,
    onClick: () => {
      navigator.clipboard.writeText(
        citations.map((citation) => citation[key]).join(" | "),
      );
    },
  }));

  const copyAll = {
    label: superdesk.localization.gettext("All"),
    onClick: () => {
      navigator.clipboard.writeText(
        citations
          .map((citation) =>
            Object.keys(fields)
              .map((key) => citation[key])
              .join(" "),
          )
          .join(" | "),
      );
    },
  };

  return [
    {
      label: superdesk.localization.gettext("Copy"),
      icon: "icon-copy",
      children: [copyAll, ...copyChildren],
    },
  ];
};

export const CitationDetails = () => {
  const { citation, setCitation } = useSelectedCitation();

  const [isOpen, setIsOpen] = React.useState(false);

  const menuItems = getMenuItems([citation], {
    description: { label: superdesk.localization.gettext("Description") },
  });

  React.useEffect(() => {
    setIsOpen(Boolean(citation));
  }, [citation]);

  return (
    <Panel open={isOpen} side="right" background="transparent">
      <PanelHeader
        title={citation?.slugline}
        onClose={() => {
          setCitation(null);
        }}
        iconButtons={[
          <Menu items={menuItems}>
            {(toggle) => (
              <IconButton
                icon="dots-vertical"
                ariaValue={superdesk.localization.gettext("Actions")}
                onClick={toggle}
              />
            )}
          </Menu>,
        ]}
      />
      <PanelContent>
        <PanelContentBlock padding="1-5">
          {citation?.description}
        </PanelContentBlock>
      </PanelContent>
    </Panel>
  );
};
