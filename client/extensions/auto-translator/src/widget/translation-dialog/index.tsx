import { Formik, FormikConfig } from "formik";
import * as React from "react";
import { IArticle } from "superdesk-api";
import { Modal } from "superdesk-ui-framework/react";
import { useSuperdesk } from "../../context";
import { getObjectValues } from "../../utilities";
import { Footer } from "./footer";
import { TranslationForm } from "./form";
import {
  ExtraTranslationDialogFormProps,
  FORM_FIELDS,
  getTranslationDialogFormInitialValues,
  TranslationDialogFormProps,
  validateTranslationDialogForm,
} from "./helpers";

export const TranslationDialog = ({
  article,
  closeDialog,
}: {
  article: IArticle;
  closeDialog: () => void;
}) => {
  const superdesk = useSuperdesk(),
    { gettext } = superdesk.localization,
    { applyFieldChangesToEditor } = superdesk.ui.article,
    { _id: articleId } = article,
    formRef = React.useRef<HTMLFormElement>(null);

  const onSubmit: FormikConfig<TranslationDialogFormProps>["onSubmit"] = (
    values,
    _formikHelpers
  ) => {
    if (!articleId) return;

    for (const value of getObjectValues(FORM_FIELDS))
      applyFieldChangesToEditor(
        articleId,
        value.setEditorValue(values, { article })
      );

    closeDialog();
  };

  return (
    <Formik<TranslationDialogFormProps, ExtraTranslationDialogFormProps>
      enableReinitialize
      initialValues={getTranslationDialogFormInitialValues(superdesk)}
      onSubmit={onSubmit}
      validate={validateTranslationDialogForm(superdesk)}
      initialStatus={{ isLoading: true, isTranslatePristine: true }}
    >
      <Modal
        headerTemplate={gettext("Translation Widget")}
        visible
        size="x-large"
        onHide={closeDialog}
        footerTemplate={<Footer closeDialog={closeDialog} formRef={formRef} />}
      >
        <TranslationForm article={article} ref={formRef} />
      </Modal>
    </Formik>
  );
};
