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
} from "superdesk-ui-framework/react";

const { AuthoringWidgetLayout, AuthoringWidgetHeading } = superdesk.components;

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
  state = { isTranslationOpen: false };

  render() {
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
                  <Button text="Create" type="primary" onClick={() => {}} />
                </ButtonGroup>
              }
            >
              <>
                <GridList>
                  <Select value="Option 1" label="Select 1" onChange={() => {}}>
                    <Option>Option 1</Option>
                    <Option>Option 2</Option>
                  </Select>
                  <Select value="Option 2" label="Select 2" onChange={() => {}}>
                    <Option>Option 1</Option>
                    <Option>Option 2</Option>
                  </Select>
                  <Button text="Translate" type="primary" onClick={() => {}} />
                </GridList>
                <ContentDivider />
                <ResizablePanels direction="horizontal" primarySize={{ min: 33, default: 50 }} secondarySize={{ min: 33, default: 50 }}>
                  <Container gap="large" direction="column" className="sd-padding-2">
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
                  <Container gap="large" direction="column" className="sd-padding-2">
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
      </>
    );
  }
}
