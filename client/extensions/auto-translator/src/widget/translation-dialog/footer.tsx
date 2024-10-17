import * as React from "react";
import { Button, ButtonGroup } from "superdesk-ui-framework/react";

type FooterProps = { closeDialog: () => void };

export const Footer = ({ closeDialog }: FooterProps) => {
  return (
    <ButtonGroup align="end">
      <Button text="Cancel" style="hollow" onClick={closeDialog} />
      <button
        type="submit"
        aria-label="Apply Translation"
        className="btn btn--primary btn--hollow"
      >
        Apply Translation
      </button>
    </ButtonGroup>
  );
};
