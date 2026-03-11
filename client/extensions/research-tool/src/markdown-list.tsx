import * as React from "react";
import { SpacerBlock } from "superdesk-ui-framework/react";
import { useMarkdown } from "./context/markdown-context";
import { MarkdownItem } from "./markdown-item";

export const MarkdownList = () => {
  const { markdown } = useMarkdown();

  return (
    <>
      {markdown.reverse().map((m, i) => (
        <React.Fragment key={`markdown-${i}`}>
          <MarkdownItem markdown={m} />
          {markdown.length !== i && <SpacerBlock v gap="4" />}
        </React.Fragment>
      ))}
    </>
  );
};
