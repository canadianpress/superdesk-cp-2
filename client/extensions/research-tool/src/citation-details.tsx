import * as React from "react";
import {
  Badge,
  GridItemText,
  GridItemTime,
  GridItemTitle,
  IconButton,
  Menu,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelFooter,
  PanelHeader,
} from "superdesk-ui-framework/react";
import { useSelectedCitation } from "./context/selected-citation-context";
import { superdesk } from "./superdesk";
import { Citation } from "./typings/chat";

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
  const { citation, setSelectedCitation } = useSelectedCitation();

  const [isOpen, setIsOpen] = React.useState(false);

  const menuItems = citation
    ? getMenuItems([citation], {
        description: { label: superdesk.localization.gettext("Description") },
      })
    : [];

  React.useEffect(() => {
    setIsOpen(Boolean(citation));
  }, [citation]);

  if (!citation) return null;
  return (
    <Panel open={isOpen} side="right" background="transparent">
      <PanelHeader
        title={citation.slugline}
        onClose={() => {
          setSelectedCitation(null);
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
          <GridItemTime time={citation.date_published} />
          <GridItemTitle>{citation.headline}</GridItemTitle>
          <GridItemText>{citation.description}</GridItemText>
        </PanelContentBlock>
      </PanelContent>
      <PanelFooter>
        <Badge text={citation.citation_id} />
        <Badge text={citation.language} />
        <Badge text={citation.type} />
      </PanelFooter>
    </Panel>
  );
};
