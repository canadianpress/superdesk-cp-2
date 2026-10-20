import * as React from "react";
import { SearchBar } from "superdesk-ui-framework/react";
import { useChatActions } from "./context/chat-actions-context";
import { superdesk } from "./superdesk";

export const Form = () => {
  const { submitQuery } = useChatActions();

  const [query, setQuery] = React.useState("");

  const handleOnSubmit = (newQuery: string) => {
    if (!submitQuery(newQuery)) return;

    setQuery(newQuery);
    setTimeout(() => {
      setQuery("");
    });
  };

  return (
    <div style={{ width: "65%" }}>
      <SearchBar
        value={query}
        type="boxed"
        placeholder={superdesk.localization.gettext("Ask a question")}
        boxed
        onSubmit={handleOnSubmit}
      />
    </div>
  );
};
