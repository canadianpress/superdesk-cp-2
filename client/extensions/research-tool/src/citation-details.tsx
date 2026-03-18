import * as React from "react";
import {
  IconButton,
  Menu,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelHeader,
} from "superdesk-ui-framework/react";
import type { Citation } from "./context/citations-context";
import { useSelectedCitation } from "./context/selected-citation-context";
import { superdesk } from "./superdesk";

type BaseFields = {
  [K in keyof Omit<Citation, "citation_id" | "uri" | "description">]: {
    label: string;
  };
};

type ExtraFields = {
  [K in keyof Partial<Citation>]: {
    label: string;
  };
};

const FIELDS: BaseFields = {
  slugline: { label: superdesk.localization.gettext("Slugline") },
  headline: { label: superdesk.localization.gettext("Headline") },
  date_published: { label: superdesk.localization.gettext("Date published") },
  language: { label: superdesk.localization.gettext("Language") },
  source: { label: superdesk.localization.gettext("Source") },
  type: { label: superdesk.localization.gettext("Type") },
};

export const getMenuItems = (
  citations: Array<Citation>,
  extraFields?: ExtraFields,
) => {
  const fields = { ...FIELDS, ...extraFields };

  const copyChildren = Object.entries(fields).map(([key, { label }]) => ({
    label,
    onClick: () => {
      navigator.clipboard.writeText(
        citations
          .map((citation) => citation[key as keyof typeof citation])
          .join(" | "),
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
              .map((key) => citation[key as keyof typeof citation])
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

  const menuItems = citation
    ? getMenuItems([citation], {
        description: { label: superdesk.localization.gettext("Description") },
      })
    : [];

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
        iconButtons={
          menuItems
            ? [
                <Menu key="citation-details-header-menu" items={menuItems}>
                  {(toggle) => (
                    <IconButton
                      icon="dots-vertical"
                      ariaValue={superdesk.localization.gettext("Actions")}
                      onClick={toggle}
                    />
                  )}
                </Menu>,
              ]
            : []
        }
      />
      <PanelContent>
        <PanelContentBlock padding="1-5">
          {citation?.description}
        </PanelContentBlock>
      </PanelContent>
    </Panel>
  );
};
