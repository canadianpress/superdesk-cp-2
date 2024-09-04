import { startApp } from 'superdesk-core/scripts/index';

setTimeout(() => {
    startApp(
        [
            {
                id: 'planning-extension',
                load: () => import('superdesk-planning/client/planning-extension'),
                configuration: {
                    assignmentsTopBarWidget: true,
                },
            },
            {
                id: 'orangelogic-extension',
                load: () => import('./extensions/orangelogic-extension'),
            },
            {
                id: 'upload-iptc',
                load: () => import('./extensions/upload-iptc'),
            },
            {
                id: 'auto-tagger',
                load: () => import('./extensions/auto-tagger'),
            },
            {
                id: 'usage-metrics',
                load: () => import('superdesk-core/scripts/extensions/usageMetrics'),
            },
            {
                id: 'auto-translator',
                load: () => import('./extensions/auto-translator')
            },
            {
                id: 'ai-widget',
                load: () => import('superdesk-core/scripts/extensions/ai-widget').then((widget) => {
                    widget.configure((superdesk) => ({
                        translations: {
                            translateActionIntegration: true,
                            generateTranslations: (article, language) => {
                                return new Promise(resolve => resolve(["TEST TRANSLATE BODY"]))
                            },
                        },
                        generateHeadlines: (article) => {
                            return new Promise(resolve => resolve(["TEST TRANSLATE HEADLINES"]))
                        },
                        generateSummary: (article) => {
                            return new Promise(resolve => resolve(["TEST TRANSLATE SUMMARY"]))
                        }
                    }))
                    return widget
                }),
            }
        ],
        {},
    );
});

export default angular.module('main.superdesk', []);
