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
  InputWrapper,
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
  const { AuthoringWidgetHeading, AuthoringWidgetLayout, Editor3Html } =
    superdesk.components;

  console.log({ article });

  return (
    <AuthoringWidgetLayout
      header={
        <AuthoringWidgetHeading
          widgetId={WIDGET_ID}
          widgetName={superdesk.localization.gettext("Summarization Widget")}
          editMode={true}
        >
          <ButtonGroup align="end">
            <Button
              text={superdesk.localization.gettext("Reset")}
              onClick={() => {}}
              type="tertiary"
            />
            <Button
              text={superdesk.localization.gettext("Regenerate")}
              onClick={() => {}}
              type="secondary"
            />
            <Button
              text={superdesk.localization.gettext("Save")}
              onClick={() => {}}
              type="primary"
            />
          </ButtonGroup>
        </AuthoringWidgetHeading>
      }
      body={
        <div style={{ gridRow: "2/3" }}>
          <InputWrapper
            label={superdesk.localization.gettext("Summary")}
            value={""}
            maxLength={Number.POSITIVE_INFINITY}
            boxedLable
          >
            <Editor3Html
              value={""}
              onChange={() => {}}
              readOnly={false}
              editorFormat={["h2", "bold", "link"]}
            />
          </InputWrapper>
        </div>
        // <Spacer
        //   v
        //   gap="32"
        //   justifyContent="space-between"
        //   alignItems="stretch"
        //   noWrap
        //   style={{ gridRow: "1/-1" }}
        // >
        //   <div>

        //   </div>
        //   <Button
        //     text={superdesk.localization.gettext("Generate summary")}
        //     onClick={() => {}}
        //     type="primary"
        //   />
        // </Spacer>
      }
      footer={
        <div style={{ display: "grid" }}>
          <Button
            text={superdesk.localization.gettext("Generate summary")}
            onClick={() => {}}
            type="primary"
          />
        </div>
      }
    />
  );
};

export default extension;
