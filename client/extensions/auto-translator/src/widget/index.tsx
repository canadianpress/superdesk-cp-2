import * as React from "react"
import { superdesk } from "../superdesk"
import { IArticleSideWidgetComponentType } from "superdesk-api";
import { IllustrationButton, Modal, SvgIconIllustration, Spacer, ResizablePanels } from "superdesk-ui-framework/react";

const { AuthoringWidgetLayout, AuthoringWidgetHeading } = superdesk.components;

const WIDGET_ID = 'auto-translator-widget'

function renderResult({ header, body, footer }: { header?: JSX.Element, body: JSX.Element, footer?: JSX.Element }) {
    return (
        <AuthoringWidgetLayout
            header={(
                <Spacer v gap="0" alignItems="center">
                    <AuthoringWidgetHeading
                        widgetId={WIDGET_ID}
                        // TODO: add localization
                        widgetName={"Auto Translate"}
                        editMode={false}
                    />
                    {header}
                </Spacer>
            )}
            body={body}
            footer={footer}
        />
    );
}

export class AutoTranslatorWidget extends React.Component<IArticleSideWidgetComponentType> {
    state = { isTranslationOpen: false }

    render() {
        console.count("autoTranslatorWidget")
        return <>
            {renderResult({
                body: <div className="
                                        sd-grid-list
                                        sd-grid-list--xx-small
                                        sd-grid-list--gap-s
                                        sd-grid-list--no-margin
                                    "
                >
                    <IllustrationButton
                        text='Translate'
                        onClick={() => {
                            this.setState({ isTranslationOpen: true })
                        }}
                    >
                        <SvgIconIllustration illustration="translate" />
                    </IllustrationButton>
                </div>
            })}
            {this.state.isTranslationOpen &&
                <Modal headerTemplate="Extra large modal" visible={this.state.isTranslationOpen} size='x-large' onHide={() => { this.setState({ isTranslationOpen: false }) }} zIndex={10000}>
                    <ResizablePanels direction="horizontal" primarySize={{ min: 33, default: 50 }} secondarySize={{ min: 33, default: 50 }}>
                        <div>
                            TEST LEFT SIDE
                        </div>

                        <div>
                            TEST RIGHT SIDE
                        </div>
                    </ResizablePanels>
                </Modal>
            }
        </>
    }
}