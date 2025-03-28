import { useFormikContext } from "formik";
import * as React from "react";
import { Button, ButtonGroup } from "superdesk-ui-framework/react";
import { superdesk } from "../../superdesk";
import { TranslationDialogFormProps } from "./helpers";

type FooterProps = {
  isLoading: boolean;
  closeDialog: () => void;
};

export const Footer = ({ isLoading, closeDialog }: FooterProps) => {
  const { gettext } = superdesk.localization;
  const { isValid } = useFormikContext<TranslationDialogFormProps>();

  return (
    <ButtonGroup align="end">
      <Button
        text={gettext("Cancel")}
        style="hollow"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closeDialog();
        }}
      />
      <Button
        text={gettext("Apply Translation")}
        type="primary"
        disabled={!isValid || isLoading}
        onClick={(event) => {
          event.stopPropagation();
        }}
      />
    </ButtonGroup>
  );
};
