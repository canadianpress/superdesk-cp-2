import { FormikContextType, useFormikContext } from "formik";
import * as React from "react";
import { IArticle } from "superdesk-api";
import { Button, Option, Spacer } from "superdesk-ui-framework/react";
import { FormSelect } from "../../components";
import {
  TRANSLATION_LANGUAGES,
  TRANSLATION_TYPES,
  TRANSLATION_VERSIONS,
} from "../../constants";
import { useConfirm } from "../../context/confirm-provider";
import { typedSetFieldValue } from "../../formik-utilties";
import { superdesk } from "../../superdesk";
import {
  TranslationPayload,
  TranslationResponse,
} from "../../typings/translation";
import { getObjectEntries, getObjectKeys } from "../../utilities";
import {
  FORM_FIELDS,
  formatWritethruLabel,
  FormInputProps,
  TranslationDialogFormProps,
} from "./helpers";
import { ReplaceAll } from "./replace-all";

type TranslationSettingsProps = {
  currentArticle: IArticle;
};

const getTranslation = (payload: TranslationPayload) => {
  const { httpRequestJsonLocal } = superdesk;

  return httpRequestJsonLocal<TranslationResponse>({
    method: "POST",
    path: "/ai",
    payload: { service: "translate", item: payload },
  });
};

const isManualTranslationDirty = ({
  values,
  getFieldMeta,
}: Pick<
  FormikContextType<TranslationDialogFormProps>,
  "values" | "getFieldMeta"
>) => {
  const { FormFieldType } = superdesk.forms;
  const { getContentStateFromHtml } = superdesk.helpers;

  return getObjectEntries(FORM_FIELDS).some(([key, value]) => {
    const field = getFieldMeta<string>(
      `translations.${values.writethru}.manualTranslation.${key}`
    );
    if (value.type === FormFieldType.textEditor3) {
      const contentState = getContentStateFromHtml(field.value);
      const text = contentState.getPlainText();
      const initialContentState = getContentStateFromHtml(
        field.initialValue ?? ""
      );
      const initialText = initialContentState.getPlainText();

      return initialText !== text;
    }
    return field.initialValue !== field.value;
  });
};

export const TranslationSettings = ({
  currentArticle,
}: TranslationSettingsProps) => {
  const { gettext } = superdesk.localization;
  const { confirm } = useConfirm();

  const {
    values,
    setFieldValue: formikSetFieldValue,
    getFieldMeta,
    initialValues,
  } = useFormikContext<TranslationDialogFormProps>();
  const setFieldValue =
    typedSetFieldValue<TranslationDialogFormProps>(formikSetFieldValue);

  const [isLoading, setIsLoading] = React.useState(false);

  const translateArticle = () => {
    const payload = {
      body_html: "",
      payload: getObjectEntries(FORM_FIELDS).reduce<
        Omit<FormInputProps, "images">
      >(
        (payload, [key, value]) => {
          payload[key] = value?.mapApiValue
            ? value.mapApiValue(
                values.translations[values.writethru].original[key]
              )
            : values.translations[values.writethru].original[key];
          return payload;
        },
        { headline: "", headline_extended: "", body_html: "" }
      ),
      target_language: values.translateTo,
      source_language: values.translateFrom,
      translation_type: values.translationType,
    } as const;

    setIsLoading(true);
    getTranslation(payload)
      .then((res) => {
        if ("error" in res.analysis) return Promise.reject(res.analysis.error);

        const versions = [
          TRANSLATION_VERSIONS.aiTranslation.value,
          TRANSLATION_VERSIONS.manualTranslation.value,
        ] as const;

        for (const version of versions) {
          for (const [key, value] of getObjectEntries(FORM_FIELDS)) {
            const rValue = res.analysis.translated_payload?.[key] ?? "";
            const fieldValue = value?.setFormValue
              ? value.setFormValue(rValue)
              : rValue;

            initialValues.translations[values.writethru][version][key] =
              fieldValue;
            setFieldValue(
              `translations.${values.writethru}.${version}.${key}`,
              fieldValue
            );
          }
        }

        return;
      })
      .catch((err) => {
        console.error({ err });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const clearTranslation = () => {
    const versions = [
      TRANSLATION_VERSIONS.aiTranslation.value,
      TRANSLATION_VERSIONS.manualTranslation.value,
    ] as const;

    for (const version of versions) {
      for (const [key, value] of getObjectEntries(FORM_FIELDS)) {
        initialValues.translations[values.writethru][version][key] =
          value.initialValue;
        setFieldValue(
          `translations.${values.writethru}.${version}.${key}`,
          value.initialValue
        );
      }
    }
  };

  const handleTranslateOnClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isManualTranslationDirty({ values, getFieldMeta })) {
      translateArticle();
      return;
    }

    confirm({
      header: gettext("Confirm Translate"),
      body: gettext(
        'By clicking "Translate" again, changes to the current manual translation will be lost. Are you sure you wish to proceed?'
      ),
      footerProps: {
        confirm: { text: gettext("Yes") },
        cancel: { text: gettext("No") },
      },
    }).then((confirmed) => {
      if (confirmed) translateArticle();
    });
  };

  const handleClearOnClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isManualTranslationDirty({ values, getFieldMeta })) {
      clearTranslation();
      return;
    }

    confirm({
      header: gettext("Confirm clear translation"),
      body: gettext(
        "Are you sure you wish to clear and lose all changes made to this translation?"
      ),
      footerProps: {
        confirm: { text: gettext("Yes, Clear") },
        cancel: { text: gettext("No") },
      },
    }).then((confirmed) => {
      if (confirmed) clearTranslation();
    });
  };

  return (
    <>
      <Spacer gap="16" style={{ flexDirection: "column" }}>
        <div className="auto-translator__translation-form-settings-container">
          <FormSelect<TranslationDialogFormProps>
            name="writethru"
            label={gettext("Writethru")}
          >
            <Option value="current">{`${gettext(
              "Current Story"
            )} ${formatWritethruLabel({
              ...currentArticle,
              isCurrentStory: true,
            })}`}</Option>
            {getObjectKeys(values.translations)
              .filter((key) => key !== "current")
              .map((writethru) => (
                <Option value={writethru} key={`writethru-${writethru}`}>
                  {writethru}
                </Option>
              ))}
          </FormSelect>
          <FormSelect<TranslationDialogFormProps>
            name="translationType"
            label={gettext("Translation Engine")}
          >
            {getObjectEntries(TRANSLATION_TYPES).map(([value, label]) => (
              <Option value={value} key={`translationType-${value}`}>
                {label}
              </Option>
            ))}
          </FormSelect>
          <FormSelect<TranslationDialogFormProps>
            name="translateFrom"
            label={gettext("Translate From")}
          >
            {getObjectEntries(TRANSLATION_LANGUAGES).map(([key, value]) => (
              <Option value={value.value} key={`translateFrom-${key}`}>
                {value.label}
              </Option>
            ))}
          </FormSelect>
          <FormSelect<TranslationDialogFormProps>
            name="translateTo"
            label={gettext("Translate To")}
          >
            {getObjectEntries(TRANSLATION_LANGUAGES).map(([key, value]) => (
              <Option value={value.value} key={`translateTo-${key}`}>
                {value.label}
              </Option>
            ))}
          </FormSelect>
          <Button
            text={gettext("Translate")}
            type="primary"
            isLoading={isLoading}
            onClick={handleTranslateOnClick}
          />
          <Button
            text={gettext("Clear")}
            style="hollow"
            disabled={isLoading}
            onClick={handleClearOnClick}
          />
        </div>
        <ReplaceAll isLoading={isLoading} />
      </Spacer>
    </>
  );
};
