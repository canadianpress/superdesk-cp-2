import * as React from "react";
import { GridList } from "superdesk-ui-framework/react";
import { CitationItem } from "./citation-item";
import { useCitations } from "./context/citations-context";

export const CitationList = () => {
  const { citations } = useCitations();

  return (
    <GridList margin="0" gap="medium">
      {Object.entries(citations).map(([citation_id, citation]) => (
        <CitationItem
          key={`citation-list-item-${citation_id}`}
          citation={citation}
        />
      ))}
    </GridList>
  );
};
