import { fetchEventSource } from "@microsoft/fetch-event-source";
import * as React from "react";
import {
  IArticle,
  IArticleSideWidgetComponentType,
  IExtension,
  IExtensionActivationResult,
} from "superdesk-api";
import {
  Button,
  ButtonGroup,
  EmptyState,
  InputWrapper,
  SpacerBlock,
} from "superdesk-ui-framework/react";
import { WIDGET_ID } from "./constants";
import { superdesk } from "./superdesk";

const extension: IExtension = {
  activate: ({ localization: { gettext } }) => {
    const result: IExtensionActivationResult = {
      contributions: {
        authoringSideWidgets: [
          {
            _id: WIDGET_ID,
            label: gettext("Summarization Widget"),
            order: 1,
            icon: "text",
            component: SummarizationWidgetComponent,
            isAllowed: (item: IArticle) => item.type === "text",
          },
        ],
      },
    };

    return Promise.resolve(result);
  },
};

class SummarizationWidgetComponent extends React.Component<IArticleSideWidgetComponentType> {
  render() {
    return <SummarizationWidget article={this.props.article} />;
  }
}

const SummarizationWidget = ({ article }: { article: IArticle }) => {
  const { url: serverUrl } = superdesk.instance.config.server;
  const { AuthoringWidgetHeading, Editor3Html } = superdesk.components;
  const { applyFieldChangesToEditor } = superdesk.ui.article;

  const [summary, setSummary] = React.useState("");
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);

  const generateSummary = async () => {
    setSummary("");
    setIsEditMode(true);
    setIsFetching(true);
    let accumulatedSummary = "";

    try {
      await fetchEventSource(`${serverUrl}/research_tool/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          headline: encodeURIComponent(article.headline ?? ""),
          slugline: encodeURIComponent(article.slugline ?? ""),
          body_html: encodeURIComponent(article.body_html ?? ""),
        }),
        credentials: "include",
        onmessage(event) {
          if (event.event !== "response.output_text.delta") return;
          const newNode = JSON.parse(event.data);
          accumulatedSummary += newNode.response.delta;
          const htmlSummary = accumulatedSummary
            .split(/\n\n+/)
            .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
            .join("");
          setSummary(htmlSummary);
        },
        onclose() {
          setIsFetching(false);
        },
        onerror(err) {
          throw err;
        },
      });
    } catch {
      superdesk.ui.notify.error(
        superdesk.localization.gettext("Failed to generate summary."),
      );
      setIsEditMode(false);
      setIsFetching(false);
    }
  };

  const reset = () => {
    setSummary("");
    setIsEditMode(false);
  };

  const save = () => {
    applyFieldChangesToEditor(article._id, { key: "abstract", value: summary });
    reset();
  };

  return (
    <>
      <AuthoringWidgetHeading
        widgetId={WIDGET_ID}
        widgetName={superdesk.localization.gettext("Summarization Widget")}
        editMode={isEditMode}
      >
        <ButtonGroup align="end">
          <Button
            text={superdesk.localization.gettext("Reset")}
            onClick={reset}
            disabled={isFetching}
            type="tertiary"
          />
          <Button
            text={superdesk.localization.gettext("Regenerate")}
            onClick={generateSummary}
            type="secondary"
            isLoading={isFetching}
          />
          <Button
            text={superdesk.localization.gettext("Save")}
            onClick={save}
            type="primary"
            disabled={!summary || isFetching}
          />
        </ButtonGroup>
      </AuthoringWidgetHeading>
      <div className="widget-content">
        <InputWrapper
          label={superdesk.localization.gettext("Summary")}
          value={summary}
          fullWidth
          inlineLabel
          labelHidden
          readonly={!isEditMode}
          maxLength={
            superdesk.instance.config.schema?.[article.profile]?.abstract
              ?.maxLength ?? undefined
          }
        >
          <Editor3Html
            value={summary}
            onChange={setSummary}
            readOnly={!isEditMode}
            scrollContainer=".widget-content"
            editorFormat={["bold", "italic", "underline"]}
          />
        </InputWrapper>
        {!isEditMode && (
          <>
            <EmptyState
              title={superdesk.localization.gettext("No summary yet")}
              description={superdesk.localization.gettext(
                'Click "Run" to generate a summary',
              )}
            />
            <span style={{ display: "grid", padding: "0 16px" }}>
              <Button
                text={superdesk.localization.gettext("Run")}
                onClick={generateSummary}
                type="primary"
                isLoading={isFetching}
              />
            </span>
            <SpacerBlock v gap="16" />
          </>
        )}
      </div>
    </>
  );
};

export default extension;
