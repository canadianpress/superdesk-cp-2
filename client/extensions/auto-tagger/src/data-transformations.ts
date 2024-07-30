import {IArticle, ISuperdesk} from 'superdesk-api';
import {OrderedMap} from 'immutable';
import {ITagUi} from './types';
import {getServerResponseKeys, toServerFormat, ITagBase, ISubjectTag, IServerResponse} from './adapter';

export function createTagsPatch(
    article: IArticle,
    tags: OrderedMap<string, ITagUi>,
    superdesk: ISuperdesk,
): Partial<IArticle> {
    const serverFormat = toServerFormat(tags, superdesk);
    const patch: Partial<IArticle> = {};

    getServerResponseKeys().forEach((key) => {
        let oldValues = OrderedMap<string, any>((article[key] || [])
            .filter((_item) => typeof _item.qcode === 'string')
            .map((_item) => [_item.qcode, _item]));

        const newValues = serverFormat[key];
        let newValuesMap = OrderedMap<string, any>();

        // Preserve tags with specific schemes
        oldValues?.forEach((tag, _qcode) => {
            // casting due to issue with immutable types
            const qcode = _qcode as string;

            if (
                tag
                && (
                    tag.scheme === 'subject_custom'
                    || tag.scheme === 'destinations'
                    || tag.scheme === 'distribution'
                )
            ) {
                newValuesMap = newValuesMap.set(qcode, tag);
            }
        });
        const wasRemoved = (tag: any) => {
            if (oldValues.has(tag.qcode) && !newValuesMap.has(tag.qcode)) {
                return true;
            } else {
                return false;
            }
        };

        // Add new values to the map, ensuring tag is defined and has a qcode
        newValues?.forEach((tag) => {
            if (tag && tag.qcode) {
                newValuesMap = newValuesMap.set(tag.qcode, tag);
            }
        });

        // Has to be executed even if newValuesMap is empty in order
        // for removed groups to be included in the patch.
        patch[key] = oldValues
            .merge(newValuesMap)
            .filter((tag) => wasRemoved(tag) !== true)
            .toArray();
    });
    return patch;
}

export function getExistingTags(article: any): IServerResponse {
    const result: IServerResponse = {};

    getServerResponseKeys().forEach((key) => {
        const values = article[key] ?? [];

        if (key === 'subject') {
            if (values.length > 0) {
                result[key] = values
                // @ts-ignore
                .filter(subjectItem => subjectItem.scheme != null) // Only include items with a scheme
                // @ts-ignore
                .map(subjectItem => {
                    // @ts-ignore
                    console.log('subjectItem in getServerResponseKeys:', subjectItem);
                    const {
                        name,
                        description,
                        qcode,
                        source,
                        altids,
                        scheme,
                        aliases,
                        original_source,
                        parent,
                        relevance,
                        creator
                    } = subjectItem;

                    // @ts-ignore
                    const subjectTag: ISubjectTag = {
                        name,
                        description,
                        qcode,
                        source,
                        altids: altids ?? {},
                        parent,
                        scheme,
                        aliases,
                        original_source,
                        relevance,
                        creator
                    };
                    console.log('subjectTag in getServerResponseKeys:', subjectTag);
                    return subjectTag;
                });
            }
        } else if (values.length > 0) {
            // @ts-ignore
            result[key] = values.map((entityItem) => {
                // @ts-ignore
                console.log('entityItem in getServerResponseKeys:', entityItem);
                const {
                    name,
                    description,
                    qcode,
                    source,
                    altids,
                    scheme,
                    aliases,
                    original_source,
                    parent,
                    relevance,
                    creator
                } = entityItem;

                // @ts-ignore
                const entityTag: ITagBase = {
                    name,
                    description,
                    qcode,
                    source,
                    altids: altids ?? {},
                    parent,
                    scheme,
                    aliases,
                    original_source,
                    relevance,
                    creator
                };
                console.log('entityTag in getServerResponseKeys:', entityTag);
                return entityTag;
            });
        }
    });

    return result;
}
