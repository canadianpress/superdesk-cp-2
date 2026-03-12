import * as React from "react";
import { Label, Spacer, WithPopover } from "superdesk-ui-framework/react";
import { useCitations } from "./context/citations-context";

export const CitationTooltip = ({ href, children }: any) => {
  const { citations } = useCitations();

  const citationId = children.join("");
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const closeTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleClose = (closePopup?: () => void) => {
    closeTimeoutRef.current = setTimeout(() => {
      if (popoverRef.current && triggerRef.current) {
        const mouseOverTrigger = triggerRef.current.matches(":hover");
        const mouseOverPopover = popoverRef.current.matches(":hover");
        if (!mouseOverTrigger && !mouseOverPopover) {
          closePopup?.();
        }
      }
    }, 50);
  };

  return (
    <WithPopover
      placement="auto"
      component={({ closePopup }) => (
        <div
          ref={popoverRef}
          className="sd-popover"
          onMouseEnter={() => {
            clearTimeout(closeTimeoutRef.current);
          }}
          onMouseLeave={() => {
            handleClose(closePopup);
          }}
        >
          <Spacer h gap="8" noWrap>
            <img src="https://placehold.co/50"></img>
            <Spacer v noWrap gap="4">
              <Spacer h noWrap gap="8">
                <h4 className="sd-popover__title">
                  {citations[citationId].title}
                </h4>
                <a href={href}>{href}</a>
              </Spacer>
              <div className="sd-popover__content">
                {citations[citationId].description}
              </div>
            </Spacer>
          </Spacer>
        </div>
      )}
    >
      {(toggle) => (
        <span
          ref={triggerRef}
          onMouseEnter={() => {
            clearTimeout(closeTimeoutRef.current);
            toggle(triggerRef.current!);
          }}
          onMouseLeave={() => {
            handleClose(() => toggle(triggerRef.current!));
          }}
        >
          <Label text={citationId} type="primary" style="hollow" />
        </span>
      )}
    </WithPopover>
  );
};
