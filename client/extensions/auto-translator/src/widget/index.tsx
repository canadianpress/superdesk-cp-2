import * as React from "react";
import { createPortal } from "react-dom";
import { superdesk } from "../superdesk";
import { IArticleSideWidgetComponentType } from "superdesk-api";
import {
  IllustrationButton,
  Modal,
  SvgIconIllustration,
  Spacer,
  ResizablePanels,
  ButtonGroup,
  Button,
  Input,
  Select,
  Option,
  Container,
  ContentDivider,
  GridList,
  InputWrapper,
} from "superdesk-ui-framework/react";

const { AuthoringWidgetLayout, AuthoringWidgetHeading, Editor3Html } = superdesk.components;
const { applyFieldChangesToEditor } = superdesk.ui.article;
const { articleInEditMode } = superdesk.state;

const WIDGET_ID = "auto-translator-widget";

function renderResult({ header, body, footer }: { header?: JSX.Element; body: JSX.Element; footer?: JSX.Element }) {
  return (
    <AuthoringWidgetLayout
      header={
        <Spacer v gap="0" alignItems="center">
          <AuthoringWidgetHeading
            widgetId={WIDGET_ID}
            // TODO: add localization
            widgetName={"Auto Translate"}
            editMode={false}
          />
          {header}
        </Spacer>
      }
      body={body}
      footer={footer}
    />
  );
}

export class AutoTranslatorWidget extends React.Component<IArticleSideWidgetComponentType> {
  state = { isTranslationOpen: false, isCreatingArticle: false, editor3Value: "" };

  render() {
    console.log({ superdesk, props: this.props });
    return (
      <>
        {renderResult({
          body: (
            <div
              className="
                            sd-grid-list
                            sd-grid-list--xx-small
                            sd-grid-list--gap-s
                            sd-grid-list--no-margin
                        "
            >
              <IllustrationButton
                text="Translate"
                onClick={() => {
                  this.setState({ isTranslationOpen: true });
                }}
              >
                <SvgIconIllustration illustration="translate" />
              </IllustrationButton>
              <IllustrationButton text="Lexicon" onClick={() => {}}>
                <SvgIconIllustration illustration="keywords" />
              </IllustrationButton>
            </div>
          ),
        })}
        {this.state.isTranslationOpen &&
          createPortal(
            <Modal
              headerTemplate="Translate"
              visible={this.state.isTranslationOpen}
              size="x-large"
              onHide={() => {
                this.setState({ isTranslationOpen: false });
              }}
              footerTemplate={
                <ButtonGroup align="end">
                  <Button
                    text="Cancel"
                    style="hollow"
                    onClick={() => {
                      this.setState({ isTranslationOpen: false });
                    }}
                  />
                  <Button
                    text="Apply"
                    type="primary"
                    style="hollow"
                    tooltip="Apply changes on the original version to the editor"
                    onClick={() => {
                      if (!articleInEditMode) return;
                      applyFieldChangesToEditor(articleInEditMode, { key: "body_html", value: this.state.editor3Value });
                      this.setState({ isTranslationOpen: false });
                    }}
                  />
                  <Button
                    text="Create"
                    type="primary"
                    tooltip="Create a translated version of the open article"
                    onClick={() => {
                      this.setState({ isCreatingArticle: true });
                    }}
                  />
                </ButtonGroup>
              }
            >
              <>
                <GridList margin="0">
                  <Select value="Option 1" label="Select 1" onChange={() => {}}>
                    <Option>Option 1</Option>
                    <Option>Option 2</Option>
                  </Select>
                  <Select value="Option 2" label="Select 2" onChange={() => {}}>
                    <Option>Option 1</Option>
                    <Option>Option 2</Option>
                  </Select>
                  <Container className="items-end">
                    <Button text="Translate" type="primary" onClick={() => {}} />
                  </Container>
                </GridList>
                <ContentDivider />
                <ResizablePanels direction="horizontal" primarySize={{ min: 33, default: 50 }} secondarySize={{ min: 33, default: 50 }}>
                  <Container gap="large" direction="column" className="mx-2">
                    <div>
                      <Select value="Original" label="Version" inlineLabel onChange={() => {}}>
                        <Option>Original</Option>
                        <Option>AI Translated</Option>
                        <Option>Manual Translation</Option>
                      </Select>
                    </div>
                    <Input
                      label="Headline"
                      value={""}
                      boxedStyle={true}
                      boxedLable={true}
                      maxLength={25}
                      type="text"
                      tabindex={0}
                      onChange={() => {}}
                    />
                    <Input
                      label="Extended Headline"
                      value={""}
                      boxedStyle={true}
                      boxedLable={true}
                      maxLength={25}
                      type="text"
                      tabindex={0}
                      onChange={() => {}}
                    />
                    <InputWrapper label="Body HTML" fullWidth boxedStyle boxedLable>
                      <Editor3Html
                        key="Body HTML"
                        value={this.state.editor3Value}
                        onChange={(value) => {
                          this.setState({ editor3Value: value });
                        }}
                        readOnly={false}
                      />
                    </InputWrapper>
                  </Container>
                  <Container gap="large" direction="column" className="mx-2">
                    <Select value="AI Translated" label="Version" onChange={() => {}}>
                      <Option>Original</Option>
                      <Option>AI Translated</Option>
                      <Option>Manual Translation</Option>
                    </Select>
                    <Input
                      label="Headline"
                      value={""}
                      boxedStyle={true}
                      boxedLable={true}
                      maxLength={25}
                      type="text"
                      tabindex={0}
                      onChange={() => {}}
                    />
                    <Input
                      label="Extended Headline"
                      value={""}
                      boxedStyle={true}
                      boxedLable={true}
                      maxLength={25}
                      type="text"
                      tabindex={0}
                      onChange={() => {}}
                    />
                    <Input label="Body" value={""} boxedStyle={true} boxedLable={true} maxLength={25} type="text" tabindex={0} onChange={() => {}} />
                  </Container>
                </ResizablePanels>
              </>
            </Modal>,
            document.body
          )}
        {this.state.isCreatingArticle &&
          createPortal(
            <Modal
              onHide={() => {
                this.setState({ isCreatingArticle: false });
              }}
              size="medium"
              visible={this.state.isCreatingArticle}
              headerTemplate="Create Translated Article"
              footerTemplate={
                <ButtonGroup align="end">
                  <Button
                    text="Cancel"
                    style="hollow"
                    onClick={() => {
                      this.setState({ isCreatingArticle: false });
                    }}
                  />
                  <Button
                    text="Create"
                    type="primary"
                    onClick={() => {
                      this.setState({});
                    }}
                  />
                </ButtonGroup>
              }
            >
              <>
                <Select value="Desk 1" label="Desk" onChange={() => {}}>
                  <Option>Desk 1</Option>
                  <Option>Desk 2</Option>
                </Select>
              </>
            </Modal>,
            document.body
          )}
      </>
    );
  }
}
