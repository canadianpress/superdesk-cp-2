import { Formik, FormikConfig, useFormikContext } from "formik";
import * as React from "react";
import { Button, ButtonGroup, Spacer } from "superdesk-ui-framework/react";
import { FormTextInput } from "../../components";
import { typedSetFieldValue } from "../../formik-utilties";

import { useSuperdesk } from "../../context";
import { getObjectKeys } from "../../utilities";
import { FORM_FIELDS, TranslationDialogFormProps } from "./helpers";

type ReplaceAllFormProps = {
  search: string;
  replace: string;
};

const getReplaceValue = (value: string, search: string, replace: string) => {
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    regex = new RegExp(escapedSearch, "gi");
  return value.replace(regex, replace);
};

export const ReplaceAll = () => {
  const superdesk = useSuperdesk(),
    { gettext } = superdesk.localization,
    { values: translationValues, setFieldValue: formikSetFieldValue } =
      useFormikContext<TranslationDialogFormProps>(),
    setFieldValue =
      typedSetFieldValue<TranslationDialogFormProps>(formikSetFieldValue);

  const onSubmit: FormikConfig<ReplaceAllFormProps>["onSubmit"] = (
    values,
    _formikHelpers
  ) => {
    if (!values.search) return;

    for (const key of getObjectKeys(FORM_FIELDS)) {
      const value =
          translationValues.translations[translationValues.writethru]
            .manualTranslation[key],
        replaceValue = getReplaceValue(value, values.search, values.replace);

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
      {({ submitForm, setFieldValue: formikSetFieldValue }) => {
        const setFieldValue =
          typedSetFieldValue<ReplaceAllFormProps>(formikSetFieldValue);

        const clearReplaceAll = () => {
          setFieldValue("search", "");
          setFieldValue("replace", "");
        };

        return (
          <Spacer h gap="16" alignItems="end" noWrap>
            <FormTextInput<ReplaceAllFormProps>
              name="search"
              label={gettext("Search")}
            />
            <FormTextInput<ReplaceAllFormProps>
              name="replace"
              label={gettext("Replace")}
            />
            <ButtonGroup align="inline">
              <Button
                text={gettext("Replace All")}
                type="primary"
                expand
                onClick={submitForm}
              />
              <Button
                text={gettext("Clear")}
                style="hollow"
                expand
                onClick={clearReplaceAll}
              />
            </ButtonGroup>
          </Spacer>
        );
      }}
    </Formik>
  );
};
