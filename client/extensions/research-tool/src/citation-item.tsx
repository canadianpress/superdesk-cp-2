import * as React from "react";
import ReactMarkdown from "react-markdown";
import {
  Checkbox,
  GridItem,
  GridItemContent,
  GridItemFooter,
  GridItemFooterActions,
  GridItemFooterBlock,
  GridItemText,
  GridItemTopActions,
  IconButton,
  Menu,
  Spacer,
} from "superdesk-ui-framework/react";
import {
  CitationFooterDetails,
  getMenuItems,
  Headline,
  Modified,
  Slugline,
} from "./citation-details";
import { CitationLinkPreview } from "./citation-link-preview";
import { useSelectedCitation } from "./context/selected-citation-context";
import { useSelectedCitations } from "./context/selected-citations-context";
import { extractGuidFromUrl } from "./guid";
import { superdesk } from "./superdesk";
import { turndown } from "./turndown";
import { Citation } from "./typings/chat";

export const CitationItem = ({ citation }: { citation: Citation }) => {
  const { setSelectedCitation } = useSelectedCitation();
  const { citations, addCitations, removeCitations } = useSelectedCitations();

  const id = extractGuidFromUrl(citation.uri) ?? citation.citation_id;
  const selected = !!citations[id];

  const menuItems = React.useMemo(
    () => [
      {
        label: superdesk.localization.gettext("View citation details"),
        icon: "icon-preview-mode",
        onClick: () => {
          setSelectedCitation(id);
        },
      },
      ...getMenuItems([citation]),
    ],
    [id, citation],
  );

  return (
    <GridItem>
      <GridItemTopActions>
        <Checkbox
          checked={selected}
          label={{
            text: superdesk.localization.gettext("Select citation #{{n}}", {
              n: citation.citation_id,
            }),
            hidden: true,
          }}
          onChange={(value) => {
            if (value) addCitations([id]);
            else removeCitations([id]);
          }}
        />
      </GridItemTopActions>
      <GridItemContent>
        <Modified citation={citation} hideLabel />
        <Slugline citation={citation} hideLabel />
        <Headline citation={citation} hideLabel />
        <GridItemText>
          <CitationLinkPreview href={citation.uri} />
        </GridItemText>
        <Description citation={citation} />
      </GridItemContent>
      <GridItemFooter>
        <GridItemFooterBlock align="left">
          <CitationFooterDetails citation={citation} />
        </GridItemFooterBlock>
        <GridItemFooterActions autohide>
          <Menu items={menuItems}>
            {(toggle) => (
              <IconButton
                icon="dots-vertical"
                ariaValue={superdesk.localization.gettext("Actions")}
                onClick={toggle}
              />
            )}
          </Menu>
        </GridItemFooterActions>
      </GridItemFooter>
    </GridItem>
  );
};

const Description = ({ citation }: { citation: Citation }) => {
  const citationSnippetsCount = citation.snippets.length;
  if (citationSnippetsCount === 0 && citation.article?.body_html) {
    const doc = new DOMParser().parseFromString(
      citation.article.body_html,
      "text/html",
    );
    const firstSection = doc.body.firstElementChild;
    if (!firstSection) return null;

    return (
      <ReactMarkdown>{turndown.turndown(firstSection.outerHTML)}</ReactMarkdown>
    );
  }

  if (citationSnippetsCount === 1)
    return <ReactMarkdown>{citation.snippets[0]}</ReactMarkdown>;

  const [showFullSnippets, setShowFullSnippets] = React.useState(false);

  return (
    <>
      <ReactMarkdown>{`${citation.snippets[0]}\n\n`}</ReactMarkdown>
      {showFullSnippets ? (
        <>
          <ReactMarkdown>
            {citation.snippets.slice(1).join("\n\n")}
          </ReactMarkdown>
          <Spacer v gap="0" noWrap alignItems="center">
            <IconButton
              icon="chevron-up-thin"
              ariaValue={superdesk.localization.gettext("Collapse")}
              onClick={() => {
                setShowFullSnippets(false);
              }}
            ></IconButton>
            <></>
          </Spacer>
        </>
      ) : (
        <Spacer v gap="0" noWrap alignItems="center">
          <IconButton
            icon="chevron-down-thin"
            ariaValue={superdesk.localization.gettext("Expand")}
            onClick={() => {
              setShowFullSnippets(true);
            }}
          ></IconButton>
          <></>
        </Spacer>
      )}
    </>
  );
};
