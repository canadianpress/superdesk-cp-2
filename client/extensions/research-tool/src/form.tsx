import * as React from "react";
import { SearchBar } from "superdesk-ui-framework/react";
import { useChatActions } from "./context/chat-actions-context";
import { superdesk } from "./superdesk";

export const Form = () => {
  const { submitQuery } = useChatActions();

  const handleOnSubmit = (newQuery: string) => {
    submitQuery(newQuery);
  };

  return (
    <div style={{ width: "65%" }}>
      <SearchBar
        placeholder={superdesk.localization.gettext("Ask a question")}
        boxed
        onSubmit={handleOnSubmit}
      />
    </div>
  );
};
