import * as React from "react";
import { SpacerBlock } from "superdesk-ui-framework/react";
import { useSelectedChat } from "./context/selected-chat-context";
import { SearchBar } from "./search-bar";

export const Form = () => {
  const { chat } = useSelectedChat();
  if (chat?.readonly) return null;

  return (
    <div style={{ width: "65%" }}>
      <SearchBar />
      <SpacerBlock v gap="32" />
    </div>
  );
};
