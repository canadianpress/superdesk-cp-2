import * as React from "react";
import { Input } from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

export const SearchBar = ({
  value,
  onChange,
}: {
  value: any;
  onChange: any;
}) => {
  return (
    <Input
      boxedStyle
      placeholder={superdesk.localization.gettext("Ask a question")}
      type="text"
      value={value}
      onChange={onChange}
    />
  );
};
