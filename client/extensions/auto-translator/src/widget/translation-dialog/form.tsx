import { FormikConfig, FormikErrors, useFormikContext } from "formik";
import * as React from "react";
import { IArticle } from "superdesk-api";
import {
  Container,
  ContentDivider,
  Option,
  ResizablePanels,
} from "superdesk-ui-framework/react";
import { FormTextEditorInput, FormTextInput, Select } from "../../components";
import {
  TRANSLATION_LANGUAGES_CODES_MAP,
  TRANSLATION_VERSIONS,
} from "../../constants";
import { superdesk } from "../../superdesk";
import {
  getObjectEntries,
  getObjectKeys,
  isArticle,
  isNotEmptyObject,
} from "../../utilities";
import { CompareAccordion } from "./compare-accordion";
import {
  FORM_FIELDS,
  FORM_FIELDS_INITIAL_VALUES,
  FormInputProps,
  isLanguageCode,
  isTranslationVersion,
  TranslationDialogFormProps,
  TranslationEntry,
} from "./helpers";
import { TranslationSettings } from "./settings";

type TranslationFormEntryProps = {
  initialVersion: keyof TranslationEntry;
};

const getImagesFormValues = (workingArticle: IArticle) =>
  getObjectEntries(workingArticle?.associations || {}).reduce<
    Record<keyof TranslationEntry, FormInputProps["images"]>
  >(
    (images, [key, article]) => {
      if (!isArticle(article)) return images;

      const description = article?.description_text;
      const thumbnailHref = article?.renditions?.thumbnail?.href;

      if (!thumbnailHref) return images;

      for (const version of getObjectKeys(TRANSLATION_VERSIONS)) {
        Object.assign(images[version], {
          [key]: { description: description ?? "", href: thumbnailHref },
        });
      }

      return images;
    },
    { original: {}, aiTranslation: {}, manualTranslation: {} }
  );

const getTranslationEntryFormValues = (
  article: IArticle,
  images: ReturnType<typeof getImagesFormValues>
) =>
  getObjectKeys(TRANSLATION_VERSIONS).reduce<TranslationEntry>(
    (formValues, version) => {
      if (version === TRANSLATION_VERSIONS.original.value) {
        formValues[version] = {
          ...getObjectEntries(FORM_FIELDS).reduce<
            Omit<FormInputProps, "images">
          >(
            (formValues, [key, value]) => {
              formValues[key] = value.getFormValue(article);
              return formValues;
            },
            { ...FORM_FIELDS_INITIAL_VALUES }
          ),
          images: {},
        };
      }
      formValues[version]["images"] = isNotEmptyObject(images[version])
        ? images[version]
        : {};

      return formValues;
    },
    {
      original: {
        ...FORM_FIELDS_INITIAL_VALUES,
        images: {},
      },
      aiTranslation: {
        ...FORM_FIELDS_INITIAL_VALUES,
        images: {},
      },
      manualTranslation: {
        ...FORM_FIELDS_INITIAL_VALUES,
        images: {},
      },
    }
  );

export const getTranslationDialogFormInitialValues = () =>
  ({
    writethru: "current",
    translationType: "basic",
    translateFrom: TRANSLATION_LANGUAGES_CODES_MAP.en,
    translateTo: TRANSLATION_LANGUAGES_CODES_MAP.fr,
    translations: {
      current: {
        original: {
          ...FORM_FIELDS_INITIAL_VALUES,
          images: {},
        },
        aiTranslation: {
          ...FORM_FIELDS_INITIAL_VALUES,
          images: {},
        },
        manualTranslation: {
          ...FORM_FIELDS_INITIAL_VALUES,
          images: {},
        },
      },
    },
  } as const);

export const getTranslationDialogFormValues = (
  currentArticle: IArticle,
  articleVersions: IArticle[]
): TranslationDialogFormProps => {
  const writethrus = articleVersions.filter((article) => article.anpa_take_key);

  const translations = writethrus.length
    ? writethrus.reduce<TranslationDialogFormProps["translations"]>(
        (translations, article) => {
          const images = getImagesFormValues(article);
          const translationEntry = getTranslationEntryFormValues(
            article,
            images
          );

          Object.assign(translations, {
            [`${article.anpa_take_key}`]: translationEntry,
          });

          return translations;
        },
        {
          current: getTranslationEntryFormValues(
            currentArticle,
            getImagesFormValues(currentArticle)
          ),
        }
      )
    : {
        current: getTranslationEntryFormValues(
          currentArticle,
          getImagesFormValues(currentArticle)
        ),
      };

  const currentArticleLanguage =
    typeof currentArticle.language === "string"
      ? currentArticle.language.toLowerCase()
      : undefined;

  const translateFrom =
    currentArticleLanguage && isLanguageCode(currentArticleLanguage)
      ? TRANSLATION_LANGUAGES_CODES_MAP[currentArticleLanguage]
      : TRANSLATION_LANGUAGES_CODES_MAP.en;
  const translateTo =
    translateFrom === TRANSLATION_LANGUAGES_CODES_MAP.en
      ? TRANSLATION_LANGUAGES_CODES_MAP.fr
      : TRANSLATION_LANGUAGES_CODES_MAP.en;

  return {
    writethru: getObjectKeys(translations)[0],
    translationType: "basic",
    translateFrom,
    translateTo,
    translations,
  };
};

export const validateTranslationDialogForm: FormikConfig<TranslationDialogFormProps>["validate"] =
  (values) => {
    const errors: FormikErrors<TranslationDialogFormProps> = {};

    for (const [key, value] of getObjectEntries(FORM_FIELDS)) {
      const error = value?.validate?.(
        values.translations[values.writethru].manualTranslation[key],
        { schema: superdesk.instance.config.schema?.["Story"]?.[key] }
      );

      if (!error) continue;

      Object.assign(errors, {
        translations: {
          [values.writethru]: {
            [TRANSLATION_VERSIONS.manualTranslation.value]: {
              ...errors?.translations?.[values.writethru]?.manualTranslation,
              [key]: error,
            },
          },
        },
      });
    }

    return errors;
  };

const TranslationFormEntry = ({
  initialVersion,
}: TranslationFormEntryProps) => {
  const { gettext } = superdesk.localization;
  const { FormFieldType } = superdesk.forms;

  const [version, setVersion] =
    React.useState<keyof TranslationEntry>(initialVersion);
  const { values } = useFormikContext<TranslationDialogFormProps>();

  return (
    <>
      <Select
        value={version}
        label={
          initialVersion === TRANSLATION_VERSIONS.original.value
            ? gettext("Version (Original Content)")
            : gettext("Version (Translated Content)")
        }
        onChange={(newValue) => {
          if (isTranslationVersion(newValue)) setVersion(newValue);
        }}
      >
        {getObjectEntries(TRANSLATION_VERSIONS).map(([key, value]) => (
          <Option value={value.value} key={`version-${key}`}>
            {value.label}
          </Option>
        ))}
      </Select>
      {getObjectEntries(FORM_FIELDS).map(([key, value]) => {
        const name = value.getName(values.writethru, version);
        const schema = superdesk.instance.config.schema?.["Story"]?.[key];
        const sharedProps = {
          key: name,
          name,
          label: value.label,
          ...(version === TRANSLATION_VERSIONS.manualTranslation.value && {
            maxLength: schema?.maxlength,
          }),
        };

        switch (value.type) {
          case FormFieldType.textEditor3:
            return (
              <FormTextEditorInput<TranslationDialogFormProps>
                {...sharedProps}
                readOnly={
                  version !== TRANSLATION_VERSIONS.manualTranslation.value
                }
              />
            );
          default:
            return (
              <FormTextInput<TranslationDialogFormProps>
                {...sharedProps}
                readonly={
                  version !== TRANSLATION_VERSIONS.manualTranslation.value
                }
              />
            );
        }
      })}
    </>
  );
};

export const TranslationForm = () => (
  <>
    <TranslationSettings />
    <ContentDivider margin="small" />
    <CompareAccordion />
    <ContentDivider margin="small" />
    <Container>
      <ResizablePanels
        direction="horizontal"
        primarySize={{ min: 33, default: 50 }}
        secondarySize={{ min: 33, default: 50 }}
      >
        <Container
          gap="large"
          direction="column"
          className="auto-translator__translation-form-panel-container"
        >
          <TranslationFormEntry
            initialVersion={TRANSLATION_VERSIONS.original.value}
          />
        </Container>
        <Container
          gap="large"
          direction="column"
          className="auto-translator__translation-form-panel-container"
        >
          <TranslationFormEntry
            initialVersion={TRANSLATION_VERSIONS.aiTranslation.value}
          />
        </Container>
      </ResizablePanels>
    </Container>
  </>
);
