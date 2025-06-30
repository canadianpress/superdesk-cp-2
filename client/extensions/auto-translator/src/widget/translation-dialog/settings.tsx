import { useFormikContext } from "formik";
import * as React from "react";
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
import { getObjectEntries } from "../../utilities";
import {
  FORM_FIELDS,
  FormInputProps,
  isManualTranslationDirty,
  TranslationDialogFormProps,
} from "./helpers";
import { ReplaceAll } from "./replace-all";

const getTranslation = (payload: TranslationPayload) => {
  const { httpRequestJsonLocal } = superdesk;

  return httpRequestJsonLocal<TranslationResponse>({
    method: "POST",
    path: "/ai",
    payload: { service: "translate", item: payload },
  });
};

export const TranslationSettings = () => {
  const { gettext } = superdesk.localization;
  const { confirm } = useConfirm();

  const {
    values,
    setFieldValue: formikSetFieldValue,
    getFieldMeta,
    initialValues,
    status,
    setStatus,
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

        if (status.isTranslatePristine)
          setStatus({ isTranslatePristine: false });
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
            <Option value="current">{values.translations.current.label}</Option>
            {getObjectEntries(values.translations)
              .filter(([k]) => k !== "current")
              .map(([k, v]) => (
                <Option value={k} key={`writethru-${k}`}>
                  {v.label}
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
