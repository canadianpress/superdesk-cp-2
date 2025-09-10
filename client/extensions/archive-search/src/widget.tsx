import moment from "moment";
import * as React from "react";
import {
  ISearchPanelWidgetProps,
  ISuperdesk,
  IVocabularyItem,
} from "superdesk-api";
import { Input, TreeSelect } from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

interface IParams {
  from: string;
  to: string;
  slugline: string;
  headline: string;
  story_text: string;
  services: string[];
}

const DistributionTreeSelect = ({
  value,
  setParams,
}: {
  value: IParams["services"];
  setParams: ISearchPanelWidgetProps<IParams>["setParams"];
}) => {
  const { gettext } = superdesk.localization;
  const { getVocabulary } = superdesk.entities.vocabulary;

  const getOptions = React.useCallback(
    () =>
      getVocabulary("distribution").items.map<
        IVocabularyItem & { value: IVocabularyItem }
      >((i) => ({ ...i, value: i })),
    []
  );

  return (
    <div className="form__row">
      <TreeSelect<IVocabularyItem>
        label={gettext("Services")}
        value={getOptions().filter((o) => value.includes(o.qcode)) ?? []}
        kind="synchronous"
        getOptions={getOptions}
        getLabel={(item) => item.name}
        getId={(item) => item.name}
        allowMultiple
        onChange={(selected) => {
          setParams({ services: selected.map((s) => s.qcode) });
        }}
      />
    </div>
  );
};
export const widgetFactory = (
  gettext: ISuperdesk["localization"]["gettext"]
): React.ComponentType<ISearchPanelWidgetProps<IParams>> => {
  return class SearchPanelWidget extends React.PureComponent<
    ISearchPanelWidgetProps<IParams>
  > {
    render() {
      const { provider, params, setParams } = this.props;
      const { DateInput } = superdesk.components;

      if (provider !== "archive_search") return null;
      return (
        <fieldset>
          <div style={{ width: "100%" }}>
            <DateInput
              label={gettext("From")}
              value={params.from ? moment(params.from, "YYYY-MM-DD") : ""}
              dateFormat="YYYY-MM-DD"
              field="from"
              onChange={(f, v) => {
                setParams({ [f]: v.format("YYYY-MM-DD") });
              }}
            />
          </div>
          <div style={{ width: "100%" }}>
            <DateInput
              label={gettext("To")}
              value={params.to ? moment(params.to, "YYYY-MM-DD") : ""}
              dateFormat="YYYY-MM-DD"
              field="to"
              onChange={(f, v) => {
                setParams({ [f]: v.format("YYYY-MM-DD") });
              }}
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
                  setParams({ slugline: value });
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
                  setParams({ headline: value });
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
                setParams({ story_text: value });
              }}
            />
          </div>
          <DistributionTreeSelect
            value={params.services}
            setParams={setParams}
          />
        </fieldset>
      );
    }
  };
};
