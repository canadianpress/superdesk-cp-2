import { Formik, FormikConfig } from "formik";
import * as React from "react";
import { IArticle } from "superdesk-api";
import { Loader, Modal } from "superdesk-ui-framework/react";
import { superdesk } from "../../superdesk";
import { getObjectValues } from "../../utilities";
import { Footer } from "./footer";
import {
  getTranslationDialogFormInitialValues,
  getTranslationDialogFormValues,
  TranslationForm,
  validateTranslationDialogForm,
} from "./form";
import { FORM_FIELDS, TranslationDialogFormProps } from "./helpers";

type TranslationDialogProps = {
  currentArticle: IArticle;
  closeDialog: () => void;
};

const getWritethrus = (article: IArticle) => {
  const { prepareSuperdeskQuery } = superdesk.helpers;
  const { httpRequestJsonLocal } = superdesk;

  const query = prepareSuperdeskQuery("/search", {
    filter: {
      $and: [
        { state: { $ne: "spiked" } },
        { family_id: { $eq: article.family_id } },
        { type: { $ne: "composite" } },
      ],
    },
    sort: [{ versioncreated: "asc" }],
    page: 1,
    max_results: 50,
  });
  return httpRequestJsonLocal<{ _items: IArticle[] }>({
    ...query,
    urlParams: { ...query?.urlParams, repo: "archive,published" },
  });
};

export const TranslationDialog = ({
  currentArticle,
  closeDialog,
}: TranslationDialogProps) => {
  const { gettext } = superdesk.localization;
  const { applyFieldChangesToEditor } = superdesk.ui.article;

  const { _id: articleId } = currentArticle;

  const onSubmit: FormikConfig<TranslationDialogFormProps>["onSubmit"] = (
    values,
    _formikHelpers
  ) => {
    if (!articleId) return;

    for (const value of getObjectValues(FORM_FIELDS)) {
      applyFieldChangesToEditor(
        articleId,
        value.setEditorValue(values, { currentArticle })
      );
    }

    closeDialog();
  };

  return (
    <Formik<TranslationDialogFormProps>
      enableReinitialize
      initialValues={getTranslationDialogFormInitialValues()}
      onSubmit={onSubmit}
      validate={validateTranslationDialogForm}
    >
      {({ resetForm, handleSubmit }) => {
        const [isLoading, setIsLoading] = React.useState(true);

        React.useEffect(() => {
          getWritethrus(currentArticle)
            .then(({ _items }) => {
              resetForm({
                values: getTranslationDialogFormValues(currentArticle, _items),
              });
            })
            .catch((err) => {
              console.error({ err });
            })
            .finally(() => {
              setIsLoading(false);
            });
        }, []);

        return (
          <form onSubmit={handleSubmit}>
            <Modal
              headerTemplate={gettext("Translation Widget")}
              visible
              size="x-large"
              onHide={closeDialog}
              footerTemplate={
                <Footer isLoading={isLoading} closeDialog={closeDialog} />
              }
            >
              {isLoading ? (
                <Loader />
              ) : (
                <TranslationForm currentArticle={currentArticle} />
              )}
            </Modal>
          </form>
        );
      }}
    </Formik>
  );
};
