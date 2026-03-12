import * as React from "react";
import {
  Card,
  SpacerBlock as SuperdeskSpacerBlock,
} from "superdesk-ui-framework/react";
import { useMarkdown } from "./context/markdown-context";
import { MarkdownItem } from "./markdown-item";

const SpacerBlock = () => {
  return (
    <span style={{ flexShrink: 0 }}>
      <SuperdeskSpacerBlock v gap="32" />
    </span>
  );
};

export const MarkdownList = () => {
  const { markdown } = useMarkdown();

  const cardStyles = {
    width: "fit-content",
    marginLeft: "auto",
  };

  return (
    <>
      {markdown.map((m, i) => (
        <React.Fragment key={`markdown-${i}`}>
          <Card
            paddingBase="2"
            style={i === 0 ? { ...cardStyles, marginTop: "auto" } : cardStyles}
          >
            {m.query}
          </Card>
          <SpacerBlock />
          <MarkdownItem markdown={m} />
          {markdown.length - 1 !== i && <SpacerBlock />}
        </React.Fragment>
      ))}
    </>
  );
};
