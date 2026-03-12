import * as React from "react";
import ReactMarkdown from "react-markdown";
import { ButtonGroup, IconButton } from "superdesk-ui-framework/react";
import type { Markdown } from "./context/markdown-context";
import { superdesk } from "./superdesk";
import { CitationTooltip } from "./tooltip";

export const MarkdownItem = ({ markdown }: { markdown: Markdown }) => (
  <>
    <ReactMarkdown components={{ a: CitationTooltip }}>
      {markdown.value}
    </ReactMarkdown>
    <ButtonGroup>
      <IconButton
        icon="copy"
        ariaValue={superdesk.localization.gettext("Copy")}
        onClick={() => {
          navigator.clipboard.writeText(markdown.value);
        }}
      />
    </ButtonGroup>
  </>
);
