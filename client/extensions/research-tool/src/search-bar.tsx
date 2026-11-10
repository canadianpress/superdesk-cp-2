import * as React from "react";
import { SearchBar as SuperdeskSearchBar } from "superdesk-ui-framework/react";
import { useChatActions } from "./context/chat-actions-context";
import { superdesk } from "./superdesk";

type SearchBarRef =
  React.ComponentProps<typeof SuperdeskSearchBar> extends React.RefAttributes<
    infer H
  >
    ? H
    : never;

export const SearchBar = () => {
  const { submitQuery } = useChatActions();

  const [resetKey, setResetKey] = React.useState(0);

  const handleOnSubmit = (newQuery: string) => {
    if (newQuery) submitQuery(newQuery);
    setResetKey((prev) => prev + 1);
  };

  const searchBarRef = React.useRef<SearchBarRef>(null);

  React.useEffect(() => {
    if (resetKey > 0) {
      searchBarRef.current?.focus();
    }
  }, [resetKey]);

  return (
    <SuperdeskSearchBar
      key={resetKey}
      ref={searchBarRef}
      placeholder={superdesk.localization.gettext("Ask a question")}
      boxed
      onSubmit={handleOnSubmit}
    />
  );
};
