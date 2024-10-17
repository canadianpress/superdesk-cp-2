import * as React from "react";
import { superdesk } from "./superdesk";
import {
  IllustrationButton,
  SvgIconIllustration,
} from "superdesk-ui-framework";

export const WIDGET_ID = "auto-translator-widget";

export function renderResult({
  header,
  body,
  footer,
}: {
  header?: JSX.Element;
  body: JSX.Element;
  footer?: JSX.Element;
}) {
  const { AuthoringWidgetLayout, AuthoringWidgetHeading, Spacer } =
    superdesk.components;

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

type MenuProps = { openTranslationDialog: () => void };

export function Menu({ openTranslationDialog }: MenuProps) {
  return (
    <div
      className="
                  sd-grid-list
                  sd-grid-list--xx-small
                  sd-grid-list--gap-s
                  sd-grid-list--no-margin
              "
    >
      <IllustrationButton text="Translate" onClick={openTranslationDialog}>
        <SvgIconIllustration illustration="translate" />
      </IllustrationButton>
      <IllustrationButton text="Lexicon" onClick={() => {}}>
        <SvgIconIllustration illustration="keywords" />
      </IllustrationButton>
    </div>
  );
}
