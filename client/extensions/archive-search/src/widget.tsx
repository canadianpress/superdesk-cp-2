import moment from "moment";
import * as React from "react";
import { ISearchPanelWidgetProps, ISuperdesk } from "superdesk-api";
import { Input } from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

interface IParams {
  from: string;
  to: string;
  slugline: string;
  headline: string;
  story_text: string;
}

export const widgetFactory = (
  gettext: ISuperdesk["localization"]["gettext"]
): React.ComponentType<ISearchPanelWidgetProps<IParams>> => {
  return class SearchPanelWidget extends React.PureComponent<
    ISearchPanelWidgetProps<IParams>
  > {
    render() {
      const { params } = this.props;
      const { DateInput } = superdesk.components;

      if (this.props.provider !== "archive_search") {
        return null;
      }

      return (
        <fieldset>
          <div style={{ width: "100%" }}>
            <DateInput
              label={gettext("From")}
              value={params.from ? moment(params.from, "YYYY-MM-DD") : ""}
              dateFormat="YYYY-MM-DD"
              field="from"
              onChange={(f, v) =>
                this.props.setParams({ [f]: v.format("YYYY-MM-DD") })
              }
            />
          </div>
          <div style={{ width: "100%" }}>
            <DateInput
              label={gettext("To")}
              value={params.to ? moment(params.to, "YYYY-MM-DD") : ""}
              dateFormat="YYYY-MM-DD"
              field="to"
              onChange={(f, v) =>
                this.props.setParams({ [f]: v.format("YYYY-MM-DD") })
              }
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
