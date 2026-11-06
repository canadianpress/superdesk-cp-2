import * as React from "react";
import {
  ContentListItem,
  Label,
  showPopup,
} from "superdesk-ui-framework/react";
import { fetchArticle, mapArticleToCitation } from "./citation-details";
import { CitationLinkPreview } from "./citation-link-preview";
import { useChatsActions } from "./context/chats-context";
import { useCitations } from "./context/citations-context";
import { useSelectedChat } from "./context/selected-chat-context";
import { useSelectedCitation } from "./context/selected-citation-context";
import { extractGuidFromUrl } from "./guid";

export const CitationTooltip = ({
  href,
  children,
}: {
  href?: string;
  children?: Array<React.ReactNode>;
}) => {
  if (!href || !children) return null;

  const { chat } = useSelectedChat();
  if (!chat) return null;

  const { setSelectedCitation } = useSelectedCitation();
  const { addCitations } = useChatsActions();

  const citations = useCitations();
  const citationId = children.join("");
  const id = extractGuidFromUrl(href) ?? citationId;
  const citation = citations[id];

  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const closePopupRef = React.useRef<
    ReturnType<typeof showPopup>["close"] | null
  >(null);

  const handleOnMouseEnter = async () => {
    if (closePopupRef.current) return;

    let data = citation;
    if (!data) {
      const article = await fetchArticle(href);
      if (!article) return;

      data = {
        citation_id: citationId,
        ...mapArticleToCitation(article),
        article,
      };
      addCitations(chat.id, { [id]: data });
    }

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
                    content: <h4>{data.headline}</h4>,
                  },
                  {
                    content: (
                      <>
                        <span>{data.slugline}</span>
                        <span>{data.date_published}</span>
                        <span>{data.language}</span>
                        <span>{data.source}</span>
                        {data.content_types.map((contentType, index) => (
                          <span
                            key={`citation-${data.citation_id}-content-type-${index}`}
                          >
                            {contentType}
                          </span>
                        ))}
                      </>
                    ),
                  },
                  {
                    content: <CitationLinkPreview href={href} />,
                  },
                ],
              },
            ]}
            onClick={() => {
              setSelectedCitation(id);
            }}
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
