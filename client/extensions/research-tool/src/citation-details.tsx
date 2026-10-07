import * as React from "react";
import ReactMarkdown from "react-markdown";
import {
  Badge,
  GridItemSlug,
  GridItemText,
  GridItemTime,
  GridItemTitle,
  IconButton,
  Menu,
  Panel,
  PanelContent,
  PanelContentBlock,
  PanelFooter,
  PanelHeader,
  Spacer,
  Text,
} from "superdesk-ui-framework/react";
import { useChatsActions } from "./context/chats-context";
import { useSelectedChat } from "./context/selected-chat-context";
import { useSelectedCitation } from "./context/selected-citation-context";
import { extractGuidFromUrl } from "./guid";
import { superdesk } from "./superdesk";
import { turndown } from "./turndown";
import { Article, Citation } from "./typings/chat";

type BaseFields = {
  [K in keyof Omit<Citation, "citation_id" | "uri" | "snippets">]: {
    label: string;
  };
};

type ExtraFields = {
  [K in keyof Partial<Citation>]: {
    label: string;
  };
};

const FIELDS: BaseFields = {
  slugline: { label: superdesk.localization.gettext("Slugline") },
  headline: { label: superdesk.localization.gettext("Headline") },
  date_published: { label: superdesk.localization.gettext("Date published") },
  language: { label: superdesk.localization.gettext("Language") },
  source: { label: superdesk.localization.gettext("Source") },
  content_types: { label: superdesk.localization.gettext("Type") },
};

export const getMenuItems = (
  citations: Array<Citation>,
  extraFields?: ExtraFields,
) => {
  const fields = { ...FIELDS, ...extraFields };

  const copyChildren = Object.entries(fields).map(([key, { label }]) => ({
    label,
    onClick: () => {
      navigator.clipboard.writeText(
        citations
          .map((citation) => {
            const value = citation[key as keyof typeof citation];
            if (Array.isArray(value)) return value.join(", ");
            return value;
          })
          .join(" | "),
      );
    },
  }));

  const copyAll = {
    label: superdesk.localization.gettext("All"),
    onClick: () => {
      navigator.clipboard.writeText(
        citations
          .map((citation) =>
            Object.keys(fields)
              .map((key) => citation[key as keyof typeof citation])
              .join(" "),
          )
          .join(" | "),
      );
    },
  };

  return [
    {
      label: superdesk.localization.gettext("Copy"),
      icon: "icon-copy",
      children: [copyAll, ...copyChildren],
    },
  ];
};

export const fetchArticle = async (
  href: string,
): Promise<Article | null | undefined> => {
  const { url: serverUrl } = superdesk.instance.config.server;

  const guid = extractGuidFromUrl(href);
  if (!guid) return;

  try {
    const res = await fetch(
      `${serverUrl}/research_tool/article_lookup?guid=${encodeURIComponent(guid)}`,
      {
        credentials: "include",
      },
    );
    if (!res.ok) return;

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch article", err);
    return null;
  }
};

export const mapArticleToCitation = (
  article: Article,
  citation?: Citation,
): Omit<Citation, "citation_id"> => ({
  uri: article.guid ?? citation?.uri,
  slugline: article.slugline ?? citation?.slugline,
  headline: (article.headline_main || article.headline) ?? citation?.headline,
  snippets: citation?.snippets.length ? citation.snippets : [],
  date_published: article.versioncreated ?? citation?.date_published,
  language: article.language ?? citation?.language,
  source: article.source ?? citation?.source,
  content_types: citation?.content_types.length ? citation.content_types : [],
});

export const CitationDetails = () => {
  const { citation, setSelectedCitation } = useSelectedCitation();
  const { chat } = useSelectedChat();
  const { addCitations } = useChatsActions();

  const menuItems = citation
    ? getMenuItems([citation], {
        snippets: { label: superdesk.localization.gettext("Description") },
      })
    : [];

  React.useEffect(() => {
    (async () => {
      if (!citation || !chat) return;

      const article = await fetchArticle(citation.uri);
      if (!article) return;

      const id = extractGuidFromUrl(citation.uri) ?? citation.citation_id;
      addCitations(chat.id, {
        [id]: {
          citation_id: citation.citation_id,
          ...mapArticleToCitation(article, citation),
          article,
        },
      });
    })();
  }, [addCitations, chat?.id, citation?.citation_id]);

  return (
    <>
      <style>
        {`
          .research-tool__citation-details {
              position: absolute;
              z-index: 2;
              top: 0;
              left: 0;
              right: 0;
          }
          .research-tool__citation-details.hidden {
              visibility: hidden;
          }
        `}
      </style>
      <Panel
        open={!!citation}
        side="right"
        className={`research-tool__citation-details ${!citation ? "hidden" : ""}`}
      >
        <PanelHeader
          title={citation?.slugline ?? ""}
          onClose={() => {
            setSelectedCitation(null);
          }}
          iconButtons={
            menuItems
              ? [
                  <Menu key="citation-details-header-menu" items={menuItems}>
                    {(toggle) => (
                      <IconButton
                        icon="dots-vertical"
                        ariaValue={superdesk.localization.gettext("Actions")}
                        onClick={toggle}
                      />
                    )}
                  </Menu>,
                ]
              : []
          }
        />
        <PanelContent>
          <PanelContentBlock padding="1-5">
            <Spacer v noWrap gap="8">
              <Spacer h gap="8" noWrap>
                {citation && <Created citation={citation} />}
                {citation && <Modified citation={citation} />}
              </Spacer>
              {citation && <Headline citation={citation} />}
              {citation && <ExtendedHeadline citation={citation} />}
              {citation && <Byline citation={citation} />}
              {citation && <Placeline citation={citation} />}
              {citation && <Description citation={citation} />}
              {citation && <BodyHTML citation={citation} />}
            </Spacer>
          </PanelContentBlock>
        </PanelContent>
        <PanelFooter>
          {citation && <CitationFooterDetails citation={citation} />}
        </PanelFooter>
      </Panel>
    </>
  );
};

const Created = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.article?.firstcreated) return null;
  if (hideLabel)
    return (
      <GridItemTime
        time={superdesk.localization.formatDate(citation.article.firstcreated)}
      />
    );
  return (
    <Spacer h gap="4" noWrap justifyContent="start">
      <Text noMargin weight="medium" color="lighter">
        {superdesk.localization.gettext("Created")}
      </Text>
      <GridItemTime
        time={superdesk.localization.formatDate(citation.article.firstcreated)}
      />
    </Spacer>
  );
};

export const Modified = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.date_published) return null;
  if (hideLabel)
    return (
      <GridItemTime
        time={superdesk.localization.formatDate(citation.date_published)}
      />
    );
  return (
    <Spacer h gap="4" noWrap justifyContent="start">
      <Text noMargin weight="medium" color="lighter">
        {superdesk.localization.gettext("Modified")}
      </Text>
      <GridItemTime
        time={superdesk.localization.formatDate(citation.date_published)}
      />
    </Spacer>
  );
};

export const Slugline = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.slugline) return null;
  if (hideLabel) return <GridItemSlug>{citation.slugline}</GridItemSlug>;
  return (
    <Spacer v gap="4" noWrap>
      <Text noMargin weight="medium" color="light">
        {superdesk.localization.gettext("Slugline")}
      </Text>
      <GridItemSlug>{citation.slugline}</GridItemSlug>
    </Spacer>
  );
};

export const Headline = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.headline) return null;
  if (hideLabel) return <GridItemTitle>{citation.headline}</GridItemTitle>;
  return (
    <Spacer v gap="4" noWrap>
      <Text noMargin weight="medium" color="light">
        {superdesk.localization.gettext("Headline")}
      </Text>
      <GridItemTitle>{citation.headline}</GridItemTitle>
    </Spacer>
  );
};

const ExtendedHeadline = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.article?.headline_extended) return null;
  if (hideLabel)
    return <GridItemText>{citation.article.headline_extended}</GridItemText>;
  return (
    <Spacer v gap="4" noWrap>
      <Text noMargin weight="medium" color="light">
        {superdesk.localization.gettext("Extended Headline")}
      </Text>
      <GridItemText>{citation.article.headline_extended}</GridItemText>
    </Spacer>
  );
};

const Byline = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.article?.byline) return null;
  if (hideLabel) return <GridItemText>{citation.article.byline}</GridItemText>;
  return (
    <Spacer v gap="4" noWrap>
      <Text noMargin weight="medium" color="light">
        {superdesk.localization.gettext("Byline")}
      </Text>
      <GridItemText>{citation.article.byline}</GridItemText>
    </Spacer>
  );
};

const Placeline = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.article?.dateline.text) return null;
  if (hideLabel)
    return <GridItemText>{citation.article.dateline.text}</GridItemText>;
  return (
    <Spacer v gap="4" noWrap>
      <Text noMargin weight="medium" color="light">
        {superdesk.localization.gettext("Placeline")}
      </Text>
      <GridItemText>{citation.article.dateline.text}</GridItemText>
    </Spacer>
  );
};

const Description = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.article?.description_text) return null;
  if (hideLabel)
    return <GridItemText>{citation.article.description_text}</GridItemText>;
  return (
    <Spacer v gap="4" noWrap>
      <Text noMargin weight="medium" color="light">
        {superdesk.localization.gettext("Description")}
      </Text>
      <GridItemText>{citation.article.description_text}</GridItemText>
    </Spacer>
  );
};

const BodyHTML = ({
  citation,
  hideLabel,
}: {
  citation: Citation;
  hideLabel?: boolean;
}) => {
  if (!citation?.article?.body_html) return null;
  if (hideLabel)
    return (
      <ReactMarkdown>
        {turndown.turndown(citation.article.body_html)}
      </ReactMarkdown>
    );
  return (
    <Spacer v gap="4" noWrap>
      <Text noMargin weight="medium" color="light">
        {superdesk.localization.gettext("Body HTML")}
      </Text>
      <ReactMarkdown>
        {turndown.turndown(citation.article.body_html)}
      </ReactMarkdown>
    </Spacer>
  );
};

export const CitationFooterDetails = ({ citation }: { citation: Citation }) => {
  const badges = [
    citation.citation_id,
    citation.language,
    citation.source,
    ...citation.content_types.filter(Boolean),
  ];

  return (
    <>
      {badges.map((text, index) => (
        <Badge key={`citation-badge-${text}-${index}`} text={text} />
      ))}
    </>
  );
};
