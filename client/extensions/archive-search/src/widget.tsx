import * as React from "react";
import { ISearchPanelWidgetProps, ISuperdesk } from "superdesk-api";
import { DatePickerISO, Input } from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

const { gettext } = superdesk.localization;

interface IParams {
  from: string;
  to: string;
  slugline: string;
  headline: string;
  story_text: string;
}

const DATE_PICKER_HEADER_BUTTONS = [
  { days: 0, label: gettext("Today") },
  { days: 1, label: gettext("Tomorrow") },
];

export const widgetFactory = (
  gettext: ISuperdesk["localization"]["gettext"]
): React.ComponentType<ISearchPanelWidgetProps<IParams>> => {
  return class SearchPanelWidget extends React.PureComponent<
    ISearchPanelWidgetProps<IParams>
  > {
    render() {
      const { params } = this.props;

      if (this.props.provider !== "archive_search") {
        return null;
      }

      return (
        <fieldset>
          <div className="form__row">
            <DatePickerISO
              label={gettext("From")}
              value={params.from ?? ""}
              dateFormat="YYYY-MM-DD"
              onChange={(v) => this.props.setParams({ from: v })}
              headerButtonBar={DATE_PICKER_HEADER_BUTTONS}
            />
          </div>
          <div className="form__row">
            <DatePickerISO
              label={gettext("To")}
              value={params.to ?? ""}
              dateFormat="YYYY-MM-DD"
              onChange={(v) => this.props.setParams({ to: v })}
              headerButtonBar={DATE_PICKER_HEADER_BUTTONS}
            />
          </div>
          <div className="form__row form__row--flex gap-1">
            <div className="flex-1">
              <Input
                label={gettext("Slugline")}
                value={params.slugline || ""}
                type="text"
                tabindex={0}
                onChange={(value) => {
                  this.props.setParams({ slugline: value });
                }}
              />
            </div>
            <div className="flex-1">
              <Input
                label={gettext("Headline")}
                value={params.headline || ""}
                type="text"
                tabindex={0}
                onChange={(value) => {
                  this.props.setParams({ headline: value });
                }}
              />
            </div>
          </div>
          <div className="form__row">
            <Input
              label={gettext("Story Text")}
              value={params.story_text || ""}
              type="text"
              tabindex={0}
              onChange={(value) => {
                this.props.setParams({ story_text: value });
              }}
            />
          </div>
        </fieldset>
      );
    }
  };
};
