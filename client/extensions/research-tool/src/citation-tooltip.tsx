import * as React from "react";
import {
  ContentListItem,
  Label,
  showPopup,
} from "superdesk-ui-framework/react";
import { CitationLinkPreview } from "./citation-link-preview";
import { useSelectedChat } from "./context/selected-chat-context";

export const CitationTooltip = ({
  href,
  children,
}: {
  href?: string;
  children?: Array<React.ReactNode>;
}) => {
  if (!href || !children) return null;

  const { chat } = useSelectedChat();

  const citations = chat?.citations ?? {};

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
              dest?.closest?.("[data-popper-placement]") ||
              dest?.closest?.("[data-test-id='menu']")
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
                    content: <h4>{citations[citationId].headline}</h4>,
                  },
                  {
                    content: (
                      <>
                        <span>{citations[citationId].slugline}</span>
                        <span>{citations[citationId].date_published}</span>
                        <span>{citations[citationId].language}</span>
                        <span>{citations[citationId].source}</span>
                        <span>{citations[citationId].type}</span>
                      </>
                    ),
                  },
                  {
                    content: <CitationLinkPreview href={href} />,
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
          dest?.closest?.("[data-popper-placement]") ||
          dest?.closest?.("[data-test-id='menu']")
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
