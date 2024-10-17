import * as React from "react";
import { Button, ButtonGroup } from "superdesk-ui-framework";

type FooterProps = { closeDialog: () => void };

export const Footer = ({ closeDialog }: FooterProps) => {
  return (
    <ButtonGroup align="end">
      <Button text="Cancel" style="hollow" onClick={closeDialog} />
      <button
        value="Apply Translation"
        aria-label="Apply Translation"
        title="Apply translation to working stage"
        className="btn--normal btn--primary btn--hollow"
      />
    </ButtonGroup>
  );
};
