import * as React from "react";
import {
  Badge,
  GridItem,
  GridItemContent,
  GridItemFooter,
  GridItemFooterActions,
  GridItemFooterBlock,
  GridItemMedia,
  GridItemText,
  GridItemTitle,
  IconButton,
  Menu,
} from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

const getMenuItems = (citation: any) => [
  {
    label: superdesk.localization.gettext("Copy"),
    icon: "copy",
    children: [
      {
        label: superdesk.localization.gettext("Title"),
        onClick: () => {
          navigator.clipboard.writeText(citation.title);
        },
      },
      {
        label: superdesk.localization.gettext("Description"),
        onClick: () => {
          navigator.clipboard.writeText(citation.description);
        },
      },
    ],
  },
];

export const CitationItem = ({ citation }: { citation: any }) => (
  <GridItem itemtype="photo">
    <GridItemMedia>
      <img src="https://placehold.co/400"></img>
    </GridItemMedia>
    <GridItemContent>
      <GridItemTitle>{citation.title}</GridItemTitle>
      <GridItemText>{citation.description}</GridItemText>
    </GridItemContent>
    <GridItemFooter>
      <GridItemFooterBlock align="left">
        <Badge text={citation.citation_id} />
      </GridItemFooterBlock>
      <GridItemFooterActions autohide>
        <Menu items={getMenuItems(citation)}>
          {(toggle) => (
            <IconButton
              icon="dots-vertical"
              ariaValue="Actions"
              onClick={toggle}
            />
          )}
        </Menu>
      </GridItemFooterActions>
    </GridItemFooter>
  </GridItem>
);
