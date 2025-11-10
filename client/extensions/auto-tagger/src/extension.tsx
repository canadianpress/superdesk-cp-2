import {
  IArticle,
  ICommonFieldConfig,
  ICustomFieldType,
  IExtension,
  IExtensionActivationResult,
  ISuperdesk,
} from "superdesk-api";
import { getAutoTaggingComponent } from "./auto-tagging";
import { getHeaderAutoTaggingComponent } from "./header-auto-tagging";

const extension: IExtension = {
  activate: (superdesk: ISuperdesk) => {
    const { gettext } = superdesk.localization;
    const label = gettext("Autotagger");

    const tagsCustomField: ICustomFieldType<
      Array<any>,
      Array<any>,
      ICommonFieldConfig,
      never
    > = {
      id: "tags",
      label: gettext("Tags"),
      generic: true,
      editorComponent: getHeaderAutoTaggingComponent(superdesk),
      previewComponent: getHeaderAutoTaggingComponent(superdesk) as any,
      hasValue: (value) => value.length > 0,
      getEmptyValue: () => [],
    };

    const result: IExtensionActivationResult = {
      contributions: {
        authoringSideWidgets: [
          {
            _id: "auto-tagging-widget",
            label: label,
            icon: "tag",
            order: 1,
            component: getAutoTaggingComponent(superdesk, label),
            isAllowed: (item: IArticle) => item.type === "text",
          },
        ],
        customFieldTypes: [tagsCustomField],
      },
    };

    return Promise.resolve(result);
  },
};

export default extension;
