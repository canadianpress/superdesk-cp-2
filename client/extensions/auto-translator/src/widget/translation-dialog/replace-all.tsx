import { Formik, FormikConfig, useFormikContext } from "formik";
import * as React from "react";
import { Button } from "superdesk-ui-framework/react";
import { FormTextInput } from "../../components";
import { typedSetFieldValue } from "../../formik-utilties";
import { superdesk } from "../../superdesk";
import { getObjectKeys } from "../../utilities";
import { FORM_FIELDS, TranslationDialogFormProps } from "./helpers";

type ReplaceAllFormProps = {
  search: string;
  replace: string;
};

const getReplaceValue = (value: string, search: string, replace: string) => {
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedSearch, "g");
  return value.replace(regex, replace);
};

export const ReplaceAll = () => {
  const { gettext } = superdesk.localization;

  const { values: translationValues, setFieldValue: formikSetFieldValue } =
    useFormikContext<TranslationDialogFormProps>();
  const setFieldValue =
    typedSetFieldValue<TranslationDialogFormProps>(formikSetFieldValue);

  const onSubmit: FormikConfig<ReplaceAllFormProps>["onSubmit"] = (
    values,
    _formikHelpers
  ) => {
    if (!values.search) return;

    for (const key of getObjectKeys(FORM_FIELDS)) {
      const value =
        translationValues.translations[translationValues.writethru]
          .manualTranslation[key];
      const replaceValue = getReplaceValue(
        value,
        values.search,
        values.replace
      );

      setFieldValue(
        `translations.${translationValues.writethru}.manualTranslation.${key}`,
        replaceValue
      );
    }
  };

  return (
    <Formik<ReplaceAllFormProps>
      initialValues={{ search: "", replace: "" }}
      onSubmit={onSubmit}
    >
      {({ submitForm }) => {
        return (
          <div className="auto-translator__translation-form-settings-container">
            <FormTextInput<ReplaceAllFormProps>
              name="search"
              label={gettext("Search")}
            />
            <FormTextInput<ReplaceAllFormProps>
              name="replace"
              label={gettext("Replace")}
            />
            <Button
              text={gettext("Replace All")}
              type="primary"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                submitForm();
              }}
            />
          </div>
        );
      }}
    </Formik>
  );
};
