import * as React from "react";
import { ButtonGroup } from "superdesk-ui-framework/react";
import { Button } from "../../components";

type FooterProps = { closeDialog: () => void };

export const Footer = ({ closeDialog }: FooterProps) => {
  return (
    <ButtonGroup align="end">
      <Button
        label="Cancel"
        aria-label="Cancel"
        superdeskButtonProps={{
          style: "hollow",
        }}
        onClick={closeDialog}
      />
      <Button
        type="submit"
        label="Apply Translation"
        aria-label="Apply Translation"
        superdeskButtonProps={{
          type: "primary",
          style: "hollow",
        }}
      />
    </ButtonGroup>
  );
};
