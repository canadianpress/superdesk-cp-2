import moment from "moment";
import * as React from "react";
import {
  ISearchPanelWidgetProps,
  ISuperdesk,
  IVocabularyItem,
} from "superdesk-api";
import {
  Input,
  TreeSelect as SuperdeskTreeSelect,
} from "superdesk-ui-framework/react";
import { superdesk } from "./superdesk";

interface IParams {
  from: string;
  to: string;
  slugline: string;
  headline: string;
  story_text: string;
  byline: string;
  distribution: string[];
  categories: string[];
  languages: string[];
  source: string[];
}

type TreeSelectProps = Record<
  string,
  {
    label: (gettext: ISuperdesk["localization"]["gettext"]) => string;
    defaultValue: string[];
    onChange: (
      setParams: (params: Partial<IParams>) => void
    ) => (selected: IVocabularyItem[]) => void;
  }
>;

const treeSelects: TreeSelectProps = {
  distribution: {
    label: (gettext) => gettext("Services"),
    defaultValue: [
      "Print",
      "QuickHit",
      "Print / Broadcast",
      "NewsBase",
      "DataSpecials",
    ],
    onChange: (setParams) => (selected) => {
      setParams({ distribution: selected.map((s) => s.qcode) });
    },
  },
  categories: {
    label: (gettext) => gettext("Wire"),
    defaultValue: [
      "a",
      "as",
      "b",
      "e",
      "f",
      "w",
      "l",
      "g",
      "c",
      "d",
      "p",
      "y",
      "x",
      "s",
      "j",
      "n",
    ],
    onChange: (setParams) => (selected) => {
      setParams({ categories: selected.map((s) => s.qcode) });
    },
  },
  languages: {
    label: (gettext) => gettext("Languages"),
    defaultValue: [],
    onChange: (setParams) => (selected) => {
      setParams({ languages: selected.map((s) => s.qcode) });
    },
  },
  source: {
    label: (gettext) => gettext("Info source"),
    defaultValue: ["CP", "PC"],
    onChange: (setParams) => (selected) => {
      setParams({ source: selected.map((s) => s.qcode) });
    },
  },
};

const TreeSelect = ({
  vocabularyKey,
  label,
  value,
  onChange,
}: Omit<TreeSelectProps[string], "label" | "onChange" | "defaultValue"> & {
  vocabularyKey: string;
  label: string;
  value: any;
  onChange: (selected: IVocabularyItem[]) => void;
}) => {
  const { getVocabulary } = superdesk.entities.vocabulary;

  const getOptions = React.useCallback(
    () =>
      (getVocabulary(vocabularyKey)?.items ?? []).map<
        IVocabularyItem & { value: IVocabularyItem }
      >((i) => ({ ...i, value: i })),
    []
  );

  return (
    <div className="form__row">
      <SuperdeskTreeSelect<IVocabularyItem>
        label={label}
        value={getOptions().filter((o) => (value ?? []).includes(o.qcode))}
        kind="synchronous"
        getOptions={getOptions}
        getLabel={(item) => item.name}
        getId={(item) => item.name}
        allowMultiple
        onChange={onChange}
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
    componentDidMount(): void {
      const { params, setParams } = this.props;
      for (const [key, { defaultValue }] of Object.entries(treeSelects)) {
        if (params[key as keyof IParams]) continue;
        setParams({ [key]: defaultValue });
      }
    }

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
          <div className="form__row">
            <Input
              label={gettext("Byline")}
              value={params.byline || ""}
              type="text"
              tabindex={0}
              onChange={(value) => {
                setParams({ byline: value });
              }}
            />
          </div>
          {Object.entries(treeSelects).map(([key, { label, onChange }]) => (
            <TreeSelect
              key={key}
              vocabularyKey={key}
              label={label(gettext)}
              value={params[key as keyof typeof params]}
              onChange={onChange(setParams)}
            />
          ))}
        </fieldset>
      );
    }
  };
};
