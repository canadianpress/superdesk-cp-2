import * as React from "react";
import ReactMarkdown from "react-markdown";
import {
  Alert,
  ButtonGroup,
  IconButton,
  Loader,
  Spacer,
} from "superdesk-ui-framework/react";
import { CitationTooltip } from "./citation-tooltip";
import { superdesk } from "./superdesk";

export type MessageAction = {
  id: "copy" | "regenerate";
  icon: React.ComponentProps<typeof IconButton>["icon"];
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export const MessageActions = ({ actions }: { actions: MessageAction[] }) =>
  actions.length > 0 ? (
    <ButtonGroup>
      {actions.map((action) => (
        <IconButton
          key={action.id}
          icon={action.icon}
          ariaValue={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
        />
      ))}
    </ButtonGroup>
  ) : null;

const MessageError = () => (
  <Alert type="alert" style="hollow" margin="none">
    {superdesk.localization.gettext("Something went wrong. Please try again.")}
  </Alert>
);

export const MessageItem = ({
  markdown,
  actions,
}: {
  markdown: string;
  actions: MessageAction[];
}) => (
  <>
    {markdown ? (
      <ReactMarkdown components={{ a: CitationTooltip }}>
        {markdown}
      </ReactMarkdown>
    ) : (
      <Loader
        overlay={false}
        width="fit-content"
        height="fit-content"
        backgroundColor="transparent"
      />
    )}
    <Spacer v gap="8" noWrap justifyContent="stretch" alignItems="stretch">
      {actions.find((action) => action.id === "regenerate") && <MessageError />}
      <MessageActions actions={actions} />
    </Spacer>
  </>
);
