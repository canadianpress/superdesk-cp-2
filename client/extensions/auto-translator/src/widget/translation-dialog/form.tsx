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
import { ValueOf } from "../../typings/utilities";
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
  formatWritethruLabel,
  FormInputProps,
  isLanguageCode,
  isTranslationVersion,
  TranslationDialogFormProps,
  TranslationEntry,
} from "./helpers";
import { TranslationSettings } from "./settings";

const { gettext } = superdesk.localization;

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
  getObjectKeys(TRANSLATION_VERSIONS).reduce<
    TranslationDialogFormProps["translations"][string]
  >(
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
      label: formatWritethruLabel(article),
    }
  );

export const getTranslationDialogFormInitialValues = () =>
  ({
    writethru: "current",
    translationType: "deepl",
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
        label: gettext("Current Story"),
      },
    },
  } as const);

export const getTranslationDialogFormValues = (
  article: IArticle,
  articleVersions: IArticle[]
): TranslationDialogFormProps => {
  const { writethrus, originals } = articleVersions.reduce<{
      writethrus: typeof articleVersions;
      originals: Partial<
        Record<
          ValueOf<typeof TRANSLATION_LANGUAGES_CODES_MAP>,
          (typeof articleVersions)[number]
        >
      >;
    }>(
      (acc, article) => {
        if (article.anpa_take_key) {
          acc.writethrus.push(article);
          return acc;
        }

        const lang = article.language?.toLowerCase();
        if (!isLanguageCode(lang)) return acc;

        acc.originals[TRANSLATION_LANGUAGES_CODES_MAP[lang]] = article;
        return acc;
      },
      { writethrus: [], originals: {} }
    ),
    current = {
      ...getTranslationEntryFormValues(article, getImagesFormValues(article)),
      label: `${gettext("Current Story")} ${formatWritethruLabel({
        ...article,
        isCurrentStory: true,
      })}`,
    },
    translations = {
      current,
      ...(originals.en && {
        [`${originals.en._id}`]: {
          ...getTranslationEntryFormValues(
            originals.en,
            getImagesFormValues(originals.en)
          ),
          label: `${
            originals.en.translated_from
              ? gettext("Translation")
              : gettext("Original")
          } (${originals.en.language})`,
        },
      }),
      ...(originals.fr && {
        [`${originals.fr._id}`]: {
          ...getTranslationEntryFormValues(
            originals.fr,
            getImagesFormValues(originals.fr)
          ),
          label: `${
            originals.fr.translated_from
              ? gettext("Translation")
              : gettext("Original")
          } (${originals.fr.language})`,
        },
      }),
      ...(writethrus.length &&
        writethrus.reduce<TranslationDialogFormProps["translations"]>(
          (translations, article) => {
            const images = getImagesFormValues(article),
              translationEntry = getTranslationEntryFormValues(article, images);
            translations[`${article._id}`] = translationEntry;
            return translations;
          },
          {}
        )),
    },
    articleLanguage =
      typeof article.language === "string"
        ? article.language.toLowerCase()
        : undefined,
    translateTo =
      articleLanguage && isLanguageCode(articleLanguage)
        ? TRANSLATION_LANGUAGES_CODES_MAP[articleLanguage]
        : TRANSLATION_LANGUAGES_CODES_MAP.en,
    translateFrom =
      translateTo === TRANSLATION_LANGUAGES_CODES_MAP.en
        ? TRANSLATION_LANGUAGES_CODES_MAP.fr
        : TRANSLATION_LANGUAGES_CODES_MAP.en;

  return {
    writethru: getObjectKeys(translations)[0],
    translationType: "deepl",
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
  const { values, isValid } = useFormikContext<TranslationDialogFormProps>();

  const translationVersions =
    initialVersion === TRANSLATION_VERSIONS.original.value
      ? getObjectEntries(TRANSLATION_VERSIONS).filter(
          ([key]) => key !== TRANSLATION_VERSIONS.manualTranslation.value
        )
      : getObjectEntries(TRANSLATION_VERSIONS);

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
        error={
          initialVersion === TRANSLATION_VERSIONS.aiTranslation.value &&
          !isValid &&
          version !== TRANSLATION_VERSIONS.manualTranslation.value
            ? gettext("Fix Manual Translation errors to apply translation")
            : undefined
        }
      >
        {translationVersions.map(([key, value]) => (
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
                maxLength={
                  version !== TRANSLATION_VERSIONS.manualTranslation.value
                    ? undefined
                    : Number.MAX_SAFE_INTEGER
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

export const TranslationForm = () => {
  const translationFormRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!translationFormRef.current) return;

    const p = translationFormRef.current.parentElement;
    const c = translationFormRef.current.querySelectorAll<HTMLDivElement>(
      ":scope > :not(:last-child)"
    );
    const resize = translationFormRef.current.querySelector<HTMLDivElement>(
      ":scope > :last-child"
    );

    if (!p || !resize || !c.length) return;

    const updateHeight = () => {
      if (!p || !resize || !c.length) return;

      let heightSum = 0;
      const pHeight = p.getBoundingClientRect().height;
      const pStyles = getComputedStyle(p);

      heightSum += parseFloat(pStyles.paddingTop || "0");
      heightSum += parseFloat(pStyles.paddingBottom || "0");
      c.forEach((c) => {
        const cStyles = getComputedStyle(c);
        heightSum += c.getBoundingClientRect().height;
        heightSum += parseFloat(cStyles.marginTop || "0");
        heightSum += parseFloat(cStyles.marginBottom || "0");
      });

      resize.style.height = `${pHeight - heightSum}px`;
    };

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(p);
    updateHeight();

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={translationFormRef}
      className="auto-translator__translation-form-form-container"
    >
      <TranslationSettings />
      <ContentDivider margin="small" />
      <CompareAccordion />
      <ContentDivider margin="small" />
      <ResizablePanels
        direction="horizontal"
        primarySize={{ min: 33, default: 50 }}
        secondarySize={{ min: 33, default: 50 }}
      >
        <Container gap="large" direction="column">
          <TranslationFormEntry
            initialVersion={TRANSLATION_VERSIONS.original.value}
          />
        </Container>
        <Container gap="large" direction="column">
          <TranslationFormEntry
            initialVersion={TRANSLATION_VERSIONS.aiTranslation.value}
          />
        </Container>
      </ResizablePanels>
    </div>
  );
};
