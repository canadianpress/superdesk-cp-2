import { Formik, FormikHelpers, FormikProps, useFormikContext } from "formik";
import * as React from "react";
import { IArticle } from "superdesk-api";
import {
  Container,
  ContentDivider,
  GridList,
  Modal,
  ResizablePanels,
} from "superdesk-ui-framework/react";
import {
  Button,
  FormTextEditorInput,
  FormTextInput,
  Select,
} from "../../components";
import { superdesk } from "../../superdesk";
import { Footer } from "./footer";
import { TRANSLATION_METHODS } from "../../utilities";

const { applyFieldChangesToEditor } = superdesk.ui.article;

type TranslationDialogProps = {
  workingArticle: IArticle;
  closeDialog: () => void;
};

type FormInputProps = {
  headline: string;
  headline_extended: string;
  body_html: string;
};

type TranslationDialogFormProps = Record<
  string,
  {
    original: FormInputProps;
    aiTranslation: FormInputProps;
    manualTranslation: FormInputProps;
  }
>;

const getTranslationDialogFormInitialValues = (
  workingArticle: IArticle
): TranslationDialogFormProps => ({
  original: {
    original: {
      headline: workingArticle.headline ?? "",
      headline_extended: workingArticle?.extra?.headline_extended ?? "",
      body_html: workingArticle.body_html ?? "",
    },
    aiTranslation: { headline: "", headline_extended: "", body_html: "" },
    manualTranslation: { headline: "", headline_extended: "", body_html: "" },
  },
  writethru1: {
    original: {
      headline: workingArticle.headline ?? "",
      headline_extended: workingArticle?.extra?.headline_extended ?? "",
      body_html: workingArticle.body_html ?? "",
    },
    aiTranslation: { headline: "", headline_extended: "", body_html: "" },
    manualTranslation: { headline: "", headline_extended: "", body_html: "" },
  },
});

const TranslationForm = ({
  initialVersion,
  writethruKey,
}: {
  initialVersion: "original" | "aiTranslation";
  writethruKey: string;
}) => {
  const [version, setVersion] = React.useState<string>(initialVersion);
  console.log({ version, writethruKey });
  return (
    <>
      <Select
        value={version}
        label="Version"
        onChange={(event) => {
          setVersion(event.currentTarget.value);
        }}
      >
        <option value="original">Original</option>
        <option value="aiTranslation">AI Translated</option>
        <option value="manualTranslation">Manual Translation</option>
      </Select>
      <FormTextInput
        name={`${writethruKey}.${version}.headline`}
        label="Headline"
      />
      <FormTextInput
        name={`${writethruKey}.${version}.headline_extended`}
        label="Extended Headline"
      />
      <FormTextEditorInput
        name={`${writethruKey}.${version}.body_html`}
        label="Body HTML"
      />
    </>
  );
};

export const TranslationDialog = ({
  workingArticle,
  closeDialog,
}: TranslationDialogProps) => {
  const [writethru, setWritethru] = React.useState<string>("original");
  const [translationMethod, setTranslationMethod] = React.useState<string>();

  const { _id: articleId } = workingArticle;

  const onSubmit = (
    values: TranslationDialogFormProps,
    // @ts-ignore
    formikHelpers: FormikHelpers<TranslationDialogFormProps>
  ) => {
    if (!articleId) return;

    applyFieldChangesToEditor(articleId, {
      key: "headline",
      value: values.writethru.manualTranslation.headline,
    });
    applyFieldChangesToEditor(articleId, {
      key: "extra",
      value: {
        ...workingArticle?.extra,
        headline_extended: values.writethru.manualTranslation.headline_extended,
      },
    });
    applyFieldChangesToEditor(articleId, {
      key: "body_html",
      value: values.writethru.manualTranslation.body_html,
    });

    closeDialog();
  };

  const translateArticle = (
    // @ts-ignore
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    const { setFieldValue } = useFormikContext<TranslationDialogFormProps>();
    setFieldValue(`${writethru}.aiTranslation.headline`, "translated headline");
    setFieldValue(
      `${writethru}.aiTranslation.headline_extended`,
      "translated headline extended"
    );
    setFieldValue(
      `${writethru}.aiTranslation.body_html`,
      "translated body html"
    );
  };

  return (
    <Formik
      // TODO: Generate inital values with writethrus
      initialValues={getTranslationDialogFormInitialValues(workingArticle)}
      onSubmit={onSubmit}
    >
      {(props: FormikProps<TranslationDialogFormProps>) => (
        <form onSubmit={props.handleSubmit}>
          <Modal
            headerTemplate="Translate"
            visible
            size="x-large"
            onHide={closeDialog}
            footerTemplate={<Footer closeDialog={closeDialog} />}
          >
            <GridList margin="0">
              <Select
                label="Writethru/Version"
                value={writethru}
                onChange={(event) => {
                  setWritethru(event.currentTarget.value);
                }}
              >
                {/* TODO: Fetch writethrus from api */}
                <option value="original">Original</option>
                <option value="writethru1">Writethru 1</option>
              </Select>
              <Select
                label="Translation Method"
                value={translationMethod}
                onChange={(event) => {
                  setTranslationMethod(event.currentTarget.value);
                }}
              >
                {Object.entries(TRANSLATION_METHODS).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Container className="items-end">
                <Button
                  label="Translate"
                  aria-label="Translate"
                  superdeskButtonProps={{ type: "primary" }}
                  onClick={translateArticle}
                />
              </Container>
            </GridList>
            <ContentDivider />
            <ResizablePanels
              direction="horizontal"
              primarySize={{ min: 33, default: 50 }}
              secondarySize={{ min: 33, default: 50 }}
            >
              <Container gap="large" direction="column" className="mx-2">
                <TranslationForm
                  initialVersion="original"
                  writethruKey={writethru}
                />
              </Container>
              <Container gap="large" direction="column" className="mx-2">
                <TranslationForm
                  initialVersion="aiTranslation"
                  writethruKey={writethru}
                />
              </Container>
            </ResizablePanels>
          </Modal>
        </form>
      )}
    </Formik>
  );
};
