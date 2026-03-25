import * as React from "react";
import {
  Badge,
  Checkbox,
  GridItem,
  GridItemContent,
  GridItemFooter,
  GridItemFooterActions,
  GridItemFooterBlock,
  GridItemSlug,
  GridItemText,
  GridItemTime,
  GridItemTitle,
  GridItemTopActions,
  IconButton,
  Menu,
} from "superdesk-ui-framework/react";
import { getMenuItems } from "./citation-details";
import { CitationLinkPreview } from "./citation-link-preview";
import { useSelectedCitation } from "./context/selected-citation-context";
import { useSelectedCitations } from "./context/selected-citations-context";
import { superdesk } from "./superdesk";
import { Citation } from "./typings/chat";

export const CitationItem = ({ citation }: { citation: Citation }) => {
  const { setSelectedCitation } = useSelectedCitation();
  const { addCitation, removeCitation } = useSelectedCitations();

  const [selected, setSelected] = React.useState(false);

  const menuItems = [
    {
      label: superdesk.localization.gettext("View citation details"),
      icon: "icon-preview-mode",
      onClick: () => {
        setSelectedCitation(citation.citation_id);
      },
    },
    ...getMenuItems([citation]),
  ];

  return (
    <GridItem>
      <GridItemTopActions>
        <Checkbox
          checked={selected}
          label={{
            text: superdesk.localization.gettext("Select citation #{{n}}", {
              n: citation.citation_id,
            }),
            hidden: true,
          }}
          onChange={(value) => {
            setSelected((prev) => !prev);
            if (value) addCitation(citation.citation_id);
            else removeCitation(citation.citation_id);
          }}
        />
      </GridItemTopActions>
      <GridItemContent>
        <GridItemTime time={citation.date_published} />
        <GridItemSlug>{citation.slugline}</GridItemSlug>
        <GridItemTitle>{citation.headline}</GridItemTitle>
        <GridItemText>
          <CitationLinkPreview href={citation.uri} />
        </GridItemText>
        <GridItemText>{citation.description}</GridItemText>
      </GridItemContent>
      <GridItemFooter>
        <GridItemFooterBlock align="left">
          <Badge text={citation.citation_id} />
          <Badge text={citation.language} />
          <Badge text={citation.type} />
        </GridItemFooterBlock>
        <GridItemFooterActions autohide>
          <Menu items={menuItems}>
            {(toggle) => (
              <IconButton
                icon="dots-vertical"
                ariaValue={superdesk.localization.gettext("Actions")}
                onClick={toggle}
              />
            )}
          </Menu>
        </GridItemFooterActions>
      </GridItemFooter>
    </GridItem>
  );
};
