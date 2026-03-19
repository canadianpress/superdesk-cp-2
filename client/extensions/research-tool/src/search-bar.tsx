import * as React from "react";
import { Input } from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

export const SearchBar = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <Input
    boxedStyle
    labelHidden
    type="text"
    size="large"
    label={superdesk.localization.gettext("Search bar")}
    placeholder={superdesk.localization.gettext("Ask a question")}
    value={value}
    onChange={onChange}
  />
);
