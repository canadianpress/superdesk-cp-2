import * as React from "react";
import { ISearchPanelWidgetProps, ISuperdesk } from "superdesk-api";
import {
  Input,
  Select,
  TreeSelect,
  Option,
} from "superdesk-ui-framework/react";

type IMediaType = "Image" | "Video";

interface IParams {
  from: string;
  to: string;
  mediaTypes: {
    [key in IMediaType]?: boolean;
  };
}

// interface IMediaTypeLabel {
//     type: IMediaType,
//     label: string;
// }

export const searchPanelWidgetFactory = (
  gettext: ISuperdesk["localization"]["gettext"]
): React.ComponentType<ISearchPanelWidgetProps<IParams>> => {
  // const mediaTypes: Array<IMediaTypeLabel> = [
  //     {
  //         type: 'Image',
  //         label: gettext('Picture'),
  //     },
  //     {
  //         type: 'Video',
  //         label: gettext('Video'),
  //     },
  // ];

  return class SearchPanelWidget extends React.PureComponent<
    ISearchPanelWidgetProps<IParams>
  > {
    toggleMediaType(type: IMediaType) {
      const mediaTypes = this.props.params.mediaTypes || {};

      mediaTypes[type] = !mediaTypes[type];
      this.props.setParams({ mediaTypes });
    }

    isActive(type: IMediaType) {
      return (
        this.props.params.mediaTypes != null &&
        this.props.params.mediaTypes[type] === true
      );
    }

    render() {
      // const {params} = this.props;

      if (this.props.provider !== "orangelogic") {
        return null;
      }
      console.log(gettext("From"));
      return (
        <fieldset className="d-flex flex-wrap gap-1">
          <div className="form__row form__row--flex gap-1">
            <div className="flex-1">
              <Input
                label="Slugline"
                value={""}
                type="text"
                tabindex={0}
                onChange={(value) => {
                  console.log({ value });
                }}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Headline"
                value={""}
                type="text"
                tabindex={0}
                onChange={(value) => {
                  console.log({ value });
                }}
              />
            </div>
          </div>
          <div className="form__row">
            <Input
              label="Story Text"
              value={""}
              type="text"
              tabindex={0}
              onChange={(value) => {
                console.log({ value });
              }}
            />
          </div>
          <div className="form__row form__row--flex gap-1">
            <div className="flex-1">
              <Input
                label="Unique Name"
                value={""}
                type="text"
                tabindex={0}
                onChange={(value) => {
                  console.log({ value });
                }}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Byline"
                value={""}
                type="text"
                tabindex={0}
                onChange={(value) => {
                  console.log({ value });
                }}
              />
            </div>
          </div>
          <div className="form__row">
            <TreeSelect
              kind="synchronous"
              value={[]}
              getOptions={() => []}
              getId={(item) => item}
              getLabel={(item) => item}
              selectBranchWithChildren
              allowMultiple
              label="Wire"
              onChange={(e) => {
                console.log({ e });
              }}
            />
          </div>
          <div className="form__row">
            <TreeSelect
              kind="synchronous"
              value={[]}
              getOptions={() => []}
              getId={(item) => item}
              getLabel={(item) => item}
              selectBranchWithChildren
              allowMultiple
              label="Index"
              onChange={(e) => {
                console.log({ e });
              }}
            />
          </div>
          <div className="form__row">
            <TreeSelect
              kind="synchronous"
              value={[]}
              getOptions={() => []}
              getId={(item) => item}
              getLabel={(item) => item}
              selectBranchWithChildren
              allowMultiple
              label="Services"
              onChange={(e) => {
                console.log({ e });
              }}
            />
          </div>
          <div className="form__row">
            <TreeSelect
              kind="synchronous"
              value={[]}
              getOptions={() => []}
              getId={(item) => item}
              getLabel={(item) => item}
              selectBranchWithChildren
              allowMultiple
              label="Language"
              onChange={(e) => {
                console.log({ e });
              }}
            />
          </div>
          <div className="form__row">
            <TreeSelect
              kind="synchronous"
              value={[]}
              getOptions={() => []}
              getId={(item) => item}
              getLabel={(item) => item}
              selectBranchWithChildren
              allowMultiple
              label="Tag"
              onChange={(e) => {
                console.log({ e });
              }}
            />
          </div>
          <div className="form__row">
            <TreeSelect
              kind="synchronous"
              value={[]}
              getOptions={() => []}
              getId={(item) => item}
              getLabel={(item) => item}
              selectBranchWithChildren
              allowMultiple
              label="Marked Desks"
              onChange={(e) => {
                console.log({ e });
              }}
            />
          </div>
          <div className="form__row form__row--flex gap-1">
            <div className="flex-1">
              <Select
                label="From Desk"
                onChange={(value) => {
                  console.log({ value });
                }}
              >
                <Option>Option 1</Option>
                <Option>Option 2</Option>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                label="To Desk"
                onChange={(value) => {
                  console.log({ value });
                }}
              >
                <Option>Option 1</Option>
                <Option>Option 2</Option>
              </Select>
            </div>
          </div>
          <div className="form__row">
            <Select
              label="Creator"
              onChange={(value) => {
                console.log({ value });
              }}
            >
              <Option>Option 1</Option>
              <Option>Option 2</Option>
            </Select>
          </div>
          <div className="form__row">
            <Select
              label="Spiked Content"
              onChange={(value) => {
                console.log({ value });
              }}
            >
              <Option>Option 1</Option>
              <Option>Option 2</Option>
            </Select>
          </div>
          <div className="form__row">
            <Select
              label="Provider"
              onChange={(value) => {
                console.log({ value });
              }}
            >
              <Option>Option 1</Option>
              <Option>Option 2</Option>
            </Select>
          </div>
          {/* <div className="field">
                        <label className="search-label"></label>
                        {mediaTypes.map((type) => (
                            <button key={type.type}
                                className={'btn btn--primary' + (this.isActive(type.type) ? ' btn--active' : '')}
                                onClick={() => this.toggleMediaType(type.type)}
                            >{type.label}</button>
                        ))}
                    </div>
                    <div className="field">
                        <label className="search-label">{gettext('From')}</label>
                        <input type="date" value={params.from || ''}
                            onChange={(event) => this.props.setParams({from: event.target.value})}
                        />
                    </div>
                    <div className="field">
                        <label className="search-label">{gettext('To')}</label>
                        <input type="date" value={params.to || ''}
                            onChange={(event) => this.props.setParams({to: event.target.value})}
                        />
                    </div> */}
        </fieldset>
      );
    }
  };
};
