import * as React from "react";
import { GridList } from "superdesk-ui-framework/react";
import { CitationItem } from "./citation-item";
import { useSelectedChat } from "./context/selected-chat-context";

export const CitationList = () => {
  const { chat } = useSelectedChat();

  const citations = chat?.citations ?? {};

  return (
    <GridList margin="0" gap="medium">
      {Object.entries(citations).map(([citationId, citation]) => (
        <CitationItem
          key={`citation-list-item-${citationId}`}
          citation={citation}
        />
      ))}
    </GridList>
  );
};
