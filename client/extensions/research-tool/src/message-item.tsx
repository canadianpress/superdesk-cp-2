import * as React from "react";
import ReactMarkdown from "react-markdown";
import { ButtonGroup, IconButton, Loader } from "superdesk-ui-framework/react";
import { CitationTooltip } from "./citation-tooltip";
import { superdesk } from "./superdesk";

export const MessageItem = ({ markdown }: { markdown: string }) =>
  !markdown ? (
    <Loader
      overlay={false}
      width="fit-content"
      height="fit-content"
      backgroundColor="transparent"
    />
  ) : (
    <>
      <ReactMarkdown components={{ a: CitationTooltip }}>
        {markdown}
      </ReactMarkdown>
      <ButtonGroup>
        <IconButton
          icon="copy"
          ariaValue={superdesk.localization.gettext("Copy")}
          onClick={() => {
            navigator.clipboard.writeText(markdown);
          }}
        />
      </ButtonGroup>
    </>
  );
