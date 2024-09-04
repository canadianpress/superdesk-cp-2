import { IExtension, IExtensionActivationResult, IArticle } from 'superdesk-api';
import { AutoTranslatorWidget } from "./widget";

const extension: IExtension = {
    activate: () => {
        // const { gettext } = superdesk.localization;
        const label = "Auto Translate"
        const result: IExtensionActivationResult = {
            contributions: {
                authoringSideWidgets: [
                    {
                        _id: 'auto-translator-widget',
                        // TODO: add localization
                        label: label,
                        icon: 'multiedit',
                        order: 1,
                        component: AutoTranslatorWidget,
                        isAllowed: (item: IArticle) => item.type === 'text',
                    },
                ],
            },
        };

        return Promise.resolve(result);
    },
};

export default extension;
