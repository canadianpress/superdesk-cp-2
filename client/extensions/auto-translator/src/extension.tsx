import * as React from "react"
import { ISuperdesk, IExtension, IExtensionActivationResult, IArticle, IArticleSideWidgetComponentType } from 'superdesk-api';

const autoTranslatorWidgetFactory = () => {
    return class Widget extends React.Component {
        render() {
            return <>TEST123</>
        }
    }
}

const extension: IExtension = {
    // @ts-ignore
    activate: (superdesk: ISuperdesk) => {
        // const { gettext } = superdesk.localization;
        const label = "Translate"
        const result: IExtensionActivationResult = {
            contributions: {
                authoringSideWidgets: [
                    {
                        _id: 'auto-translator-widget',
                        label: label,
                        icon: 'multiedit',
                        order: 1,
                        component: autoTranslatorWidgetFactory() as React.ComponentClass<IArticleSideWidgetComponentType, any>,
                        isAllowed: (item: IArticle) => item.type === 'text',
                    },
                ],
            },
        };

        return Promise.resolve(result);
    },
};

export default extension;
