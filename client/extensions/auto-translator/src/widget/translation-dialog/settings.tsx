import { FormikContextType, useFormikContext } from "formik";
import * as React from "react";
import { createPortal } from "react-dom";
import {
  Button,
  ButtonGroup,
  Modal,
  Option,
  Spacer,
} from "superdesk-ui-framework/react";
import { FormSelect } from "../../components";
import { TRANSLATION_LANGUAGES, TRANSLATION_TYPES } from "../../constants";
import { typedSetFieldValue } from "../../formik-utilties";
import { superdesk } from "../../superdesk";
import {
  TranslationPayload,
  TranslationResponse,
} from "../../typings/translation";
import { capitalize, getObjectEntries, getObjectKeys } from "../../utilities";
import {
  FORM_FIELDS,
  FormInputProps,
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

const ConfirmTranslate = ({
  closeDialog,
  onSubmit,
}: {
  closeDialog: () => void;
  onSubmit: () => void;
}) => {
  const { gettext } = superdesk.localization;

  return (
    <Modal
      headerTemplate={gettext("Confirm Translate")}
      visible
      onHide={closeDialog}
      footerTemplate={
        <ButtonGroup align="end">
          <Button
            text={gettext("No")}
            style="hollow"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeDialog();
            }}
          />
          <Button
            text={gettext("Yes")}
            type="primary"
            style="hollow"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSubmit();
            }}
          />
        </ButtonGroup>
      }
    >
      <p>
        {gettext(
          'By clicking "Translate" again, changes to the current manual translation will be lost. Are you sure you wish to proceed?'
        )}
      </p>
    </Modal>
  );
};

export const TranslationSettings = () => {
  const { gettext } = superdesk.localization;

  const {
    values,
    setFieldValue: formikSetFieldValue,
    getFieldMeta,
    initialValues,
  } = useFormikContext<TranslationDialogFormProps>();
  const setFieldValue =
    typedSetFieldValue<TranslationDialogFormProps>(formikSetFieldValue);

  const [isLoading, setIsLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const translateArticle = () => {
    const payload = {
      body_html: "",
      payload: getObjectKeys(FORM_FIELDS).reduce<
        Omit<FormInputProps, "images">
      >(
        (payload, field) => {
          payload[field] =
            values.translations[values.writethru].original[field];
          return payload;
        },
        { headline: "", headline_extended: "", body_html: "" }
      ),
      target_language: values.translateTo,
      source_language: values.translateFrom,
      translation_type: values.translationType,
    } as const;

    setShowConfirm(false);
    setIsLoading(true);

    getTranslation(payload)
      .then((res) => {
        if ("error" in res.analysis) {
          console.error(res.analysis.error);
          return;
        }

        const versions = ["aiTranslation", "manualTranslation"] as const;

        for (const version of versions) {
          for (const key of getObjectKeys(FORM_FIELDS)) {
            setFieldValue(
              `translations.${values.writethru}.${version}.${key}`,
              res.analysis.translated_payload[key]
            );
            initialValues.translations[values.writethru][version][key] =
              res.analysis.translated_payload[key];
          }
        }
      })
      .catch((err) => {
        console.error({ err });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleTranslateOnClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (isManualTranslationDirty({ values, getFieldMeta }))
      setShowConfirm(true);
    else translateArticle();
  };

  const closeConfirmDialog = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <Spacer gap="16" style={{ flexDirection: "column" }}>
        <div className="auto-translator__translation-form-settings-container">
          <FormSelect<TranslationDialogFormProps>
            name="writethru"
            label={gettext("Writethru")}
          >
            {getObjectKeys(values.translations).map((writethru) => (
              <Option value={writethru} key={`writethru-${writethru}`}>
                {capitalize(writethru)}
              </Option>
            ))}
          </FormSelect>
          <FormSelect<TranslationDialogFormProps>
            name="translationType"
            label={gettext("Translation Type (Engine)")}
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
        </div>
        <ReplaceAll />
      </Spacer>
      {showConfirm &&
        createPortal(
          <ConfirmTranslate
            closeDialog={closeConfirmDialog}
            onSubmit={translateArticle}
          />,
          document.body
        )}
    </>
  );
};
