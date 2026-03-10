import * as React from "react";
import {
  GridItem,
  GridItemContent,
  GridItemMedia,
  GridItemText,
  GridItemTitle,
} from "superdesk-ui-framework/react";

export const ListItem = ({ citation }: { citation: any }) => (
  <GridItem itemtype="photo">
    <GridItemMedia>
      <img src="https://placehold.co/400"></img>
    </GridItemMedia>
    <GridItemContent>
      <GridItemTitle>{citation.citation_id}</GridItemTitle>
      <GridItemText>{citation.description}</GridItemText>
    </GridItemContent>
  </GridItem>
);
