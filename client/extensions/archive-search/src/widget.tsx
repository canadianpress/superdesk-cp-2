import * as React from "react";
import { ISearchPanelWidgetProps, ISuperdesk } from "superdesk-api";
import { Input } from "superdesk-ui-framework/react";

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

      if (this.props.provider !== "archive_search") {
        return null;
      }

      return (
        <fieldset>
          <div className="field">
            <label className="search-label">{gettext("From")}</label>
            <input
              type="date"
              value={params.from || ""}
              onChange={(event) =>
                this.props.setParams({ from: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label className="search-label">{gettext("To")}</label>
            <input
              type="date"
              value={params.to || ""}
              onChange={(event) =>
                this.props.setParams({ to: event.target.value })
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
