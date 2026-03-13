import * as React from "react";
import {
  ContentListItem,
  Label,
  showPopup,
} from "superdesk-ui-framework/react";
import { useCitations } from "./context/citations-context";

export const CitationTooltip = ({ href, children }: any) => {
  const { citations } = useCitations();

  const citationId = children.join("");
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const closePopupRef = React.useRef<
    ReturnType<typeof showPopup>["close"] | null
  >(null);

  const handleOnMouseEnter = () => {
    if (closePopupRef.current) return;

    const { close } = showPopup(
      triggerRef.current!,
      "auto",
      () => (
        <div
          onMouseLeave={(event) => {
            const dest = event.relatedTarget as HTMLElement;
            if (!(dest instanceof HTMLElement)) {
              closePopupRef?.current?.();
              return;
            }

            if (
              triggerRef.current!.contains(dest) ||
              dest?.closest?.("[data-popper-placement]")
            )
              return;
            closePopupRef?.current?.();
          }}
        >
          <ContentListItem
            itemColum={[
              {
                fullwidth: true,
                itemRow: [
                  {
                    content: (
                      <>
                        <h4>{citations[citationId].title}</h4>
                        <a href={href}>{href}</a>
                      </>
                    ),
                  },
                  {
                    content: <div>{citations[citationId].description}</div>,
                  },
                ],
              },
            ]}
          />
        </div>
      ),
      true,
      () => {
        closePopupRef.current = null;
      },
      (event) => {
        const dest = (event as MouseEvent).relatedTarget as HTMLElement;
        if (!(dest instanceof HTMLElement)) return true;
        if (
          triggerRef.current!.contains(dest) ||
          dest?.closest?.("[data-popper-placement]")
        )
          return false;
        return true;
      },
    );
    closePopupRef.current = close;
  };

  React.useEffect(() => () => closePopupRef.current?.(), []);

  return (
    <span ref={triggerRef} onMouseEnter={handleOnMouseEnter}>
      <Label text={citationId} type="primary" style="hollow" />
    </span>
  );
};
