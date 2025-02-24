import {
  IExtension,
  IExtensionActivationResult,
  ISearchPanelWidgetProps,
  ISuperdesk,
} from "superdesk-api";
import { widgetFactory } from "./widget";

const extension: IExtension = {
  // @ts-ignore
  activate: (superdesk: ISuperdesk) => {
    const result: IExtensionActivationResult = {
      contributions: {
        searchPanelWidgets: [
          // casting is required because of limitations on use of generics in superdesk-api
          widgetFactory(superdesk.localization.gettext) as React.ComponentType<
            ISearchPanelWidgetProps<unknown>
          >,
        ],
      },
    };

    return Promise.resolve(result);
  },
};

export default extension;
