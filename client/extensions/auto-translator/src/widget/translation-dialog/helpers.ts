import { IArticle } from "superdesk-api";
import {
  TRANSLATION_LANGUAGES_CODES_MAP,
  TRANSLATION_VERSIONS,
} from "../../constants";
import { RecursiveKeyOf } from "../../formik-utilties";
import { superdesk } from "../../superdesk";
import {
  TranslationFields,
  TranslationImageField,
  TranslationType,
} from "../../typings/translation";
import { getObjectEntries, stripLinkTags } from "../../utilities";

const { FormFieldType } = superdesk.forms;
const { gettext } = superdesk.localization;

export const FORM_FIELDS: Record<
  TranslationFields,
  {
    type: (typeof FormFieldType)[keyof typeof FormFieldType];
    getName: (
      writethru: string,
      version: string
    ) => RecursiveKeyOf<TranslationDialogFormProps>;
    label: string;
    getFormValue: (article: IArticle) => string;
    setEditorValue: (
      values: TranslationDialogFormProps,
      props?: { currentArticle: IArticle }
    ) => {
      key: string;
      value: any;
    };
    initialValue: any;
    validate?: (
      value: string,
      { schema }: { schema: { maxlength: number } }
    ) => string | undefined;
    setFormValue?: (value: string) => string;
    mapApiValue?: (value: string) => string;
  }
> = {
  headline: {
    type: FormFieldType.plainText,
    getName: (writethru, version) =>
      `translations.${writethru}.${version}.headline`,
    label: gettext("Headline"),
    getFormValue: (article) => article.headline ?? "",
    setEditorValue: (values) => ({
      key: "headline",
      value: values.translations[values.writethru].manualTranslation.headline,
    }),
    initialValue: "",
    validate: (value, { schema }) => {
      if (value.length > schema.maxlength)
        return `${gettext("Headline may have a maximum character length of")} ${
          schema.maxlength
        }`;
      return;
    },
  },
  headline_extended: {
    type: FormFieldType.plainText,
    getName: (writethru, version) =>
      `translations.${writethru}.${version}.headline_extended`,
    label: gettext("Extended Headline"),
    getFormValue: (article) => article?.extra?.headline_extended ?? "",
    setEditorValue: (values, props) => ({
      key: "extra",
      value: {
        ...props?.currentArticle?.extra,
        headline_extended:
          values.translations[values.writethru].manualTranslation
            .headline_extended,
      },
    }),
    initialValue: "",
    validate: (value, { schema }) => {
      if (value.length > schema.maxlength)
        return `${gettext(
          "Extended Headline may have a maximum character length of"
        )} ${schema.maxlength}`;
      return;
    },
  },
  body_html: {
    type: FormFieldType.textEditor3,
    getName: (writethru, version) =>
      `translations.${writethru}.${version}.body_html`,
    label: gettext("body HTML"),
    getFormValue: (article) => article.body_html ?? "",
    setEditorValue: (values) => ({
      key: "body_html",
      value: values.translations[values.writethru].manualTranslation.body_html,
    }),
    initialValue: "",
    setFormValue: (value) => stripLinkTags(value),
    mapApiValue: (value) => stripLinkTags(value),
  },
};

export const FORM_FIELDS_INITIAL_VALUES = getObjectEntries(FORM_FIELDS).reduce(
  (initialValues, [key, value]) => {
    Object.assign(initialValues, { [key]: value.initialValue });
    return initialValues;
  },
  {} as Omit<FormInputProps, "images">
);

export type FormInputProps = Record<TranslationFields, string> & {
  images: Record<TranslationImageField, { description: string; href: string }>;
};

export type TranslationEntry = Record<
  keyof typeof TRANSLATION_VERSIONS,
  FormInputProps
>;

export type TranslationDialogFormProps = {
  writethru: string;
  translationType: TranslationType;
  translateFrom: (typeof TRANSLATION_LANGUAGES_CODES_MAP)[keyof typeof TRANSLATION_LANGUAGES_CODES_MAP];
  translateTo: (typeof TRANSLATION_LANGUAGES_CODES_MAP)[keyof typeof TRANSLATION_LANGUAGES_CODES_MAP];
  translations: Record<string, TranslationEntry>;
};

export const isTranslationVersion = (
  value: string
): value is keyof TranslationEntry =>
  Object.keys(TRANSLATION_VERSIONS).includes(value);

export const isLanguageCode = (
  value: string
): value is keyof typeof TRANSLATION_LANGUAGES_CODES_MAP =>
  value in TRANSLATION_LANGUAGES_CODES_MAP;

export const formatWritethruLabel = ({
  isCurrentStory,
  anpa_take_key,
  correction_sequence,
  language,
}: Partial<IArticle> & { isCurrentStory?: boolean }) => {
  let label = "";
  if (anpa_take_key)
    label += isCurrentStory ? `(${anpa_take_key})` : anpa_take_key;
  if (correction_sequence)
    label += ` #${correction_sequence} (${gettext("Corrected")})`;
  if (language) label += ` (${language})`;
  return label;
};
