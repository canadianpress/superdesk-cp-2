import * as React from "react";
import { createPortal } from "react-dom";
import { IArticleSideWidgetComponentType } from "superdesk-api";
import { Menu, renderResult } from "../utilities";
import { superdesk } from "../superdesk";
import { TranslationDialog } from "./translation-dialog";

type AutoTranslatorWidgetProps = { isTranslationOpen: boolean };

export class AutoTranslatorWidget extends React.Component<
  IArticleSideWidgetComponentType,
  AutoTranslatorWidgetProps
> {
  state = { isTranslationOpen: false };

  render() {
    console.log({ superdesk, props: this.props });

    const closeTranslationDialog = () => {
      this.setState({ isTranslationOpen: false });
    };

    return (
      <>
        {renderResult({
          body: (
            <Menu
              openTranslationDialog={() => {
                this.setState({ isTranslationOpen: true });
              }}
            />
          ),
        })}
        {this.state.isTranslationOpen &&
          createPortal(
            <TranslationDialog
              workingArticle={this.props.article}
              closeDialog={closeTranslationDialog}
            />,
            document.body
          )}
      </>
    );
  }
}
