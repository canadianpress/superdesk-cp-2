import * as React from "react";
import { Card, SpacerBlock } from "superdesk-ui-framework/react";
import { useMarkdown } from "./context/markdown-context";
import { MarkdownItem } from "./markdown-item";

export const MarkdownList = () => {
  const { markdown } = useMarkdown();

  const styles = { width: "fit-content", marginLeft: "auto" };

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
          <MarkdownItem markdown={m} />
          {markdown.length !== i && <SpacerBlock v gap="4" />}
        </React.Fragment>
      ))}
    </>
  );
};
