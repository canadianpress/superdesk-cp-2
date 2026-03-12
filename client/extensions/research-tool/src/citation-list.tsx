import * as React from "react";
import { GridList } from "superdesk-ui-framework/react";
import { useCitations } from "./context/citations-context";
import { CitationItem } from "./citation-item";

export const CitationList = () => {
  const { citations } = useCitations();

  return (
    <div style={{ overflowY: "auto", paddingRight: "1rem" }}>
      <GridList margin="0" gap="medium">
        {Object.entries(citations).map(([citation_id, citation]) => (
          <CitationItem
            key={`citation-list-item-${citation_id}`}
            citation={citation}
          />
        ))}
      </GridList>
    </div>
  );
};
