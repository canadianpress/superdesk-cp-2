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

  const styles = {
    width: "fit-content",
    marginLeft: "auto",
  };

  return (
    <>
      {markdown.map((m, i) => (
        <React.Fragment key={`markdown-${i}`}>
          <Card
            paddingBase="1"
            style={i === 0 ? { ...styles, marginTop: "auto" } : styles}
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
