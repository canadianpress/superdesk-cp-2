import * as React from "react";
import {
  GridList,
  Modal,
  Select,
  Option,
  Container,
  Button,
  ContentDivider,
  ResizablePanels,
  Input,
  InputWrapper,
} from "superdesk-ui-framework";
import { Footer } from "./footer";
import { superdesk } from "../../superdesk";
import { IArticle } from "superdesk-api";
import { Form, useField, useFormik } from "formik";

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

type TranslationDialogFormProps = {
  origin: FormInputProps;
  aiTranslation: FormInputProps;
  manualTranslation: FormInputProps;
};

type TranslationFormProps = { key: keyof TranslationDialogFormProps };

const translationDialogFormInitialValues: TranslationDialogFormProps = {
  origin: { headline: "", headline_extended: "", body_html: "" },
  aiTranslation: { headline: "", headline_extended: "", body_html: "" },
  manualTranslation: { headline: "", headline_extended: "", body_html: "" },
} as const;

const TextInput = ({ name }: { name: string }) => {
  const [field] = useField(name);

  return (
    <Input
      label="Headline"
      boxedStyle={true}
      boxedLable={true}
      maxLength={25}
      type="text"
      tabindex={0}
      {...field}
    />
  );
};

const TextEditorInput = ({ name }: { name: string }) => {
  const [field] = useField(name);
  const { Editor3Html } = superdesk.components;

  return (
    <InputWrapper label="Body HTML" fullWidth boxedStyle boxedLable>
      <Editor3Html key="Body HTML" readOnly={false} {...field} />
    </InputWrapper>
  );
};

const TranslationForm = ({ key }: TranslationFormProps) => {
  return (
    <>
      <TextInput name={`${key}.headline`} />
      <TextInput name={`${key}.headline_extended`} />
      <TextEditorInput name={`${key}.body_html`} />
    </>
  );
};

export const TranslationDialog = ({
  workingArticle,
  closeDialog,
}: TranslationDialogProps) => {
  const onSubmit = (values: TranslationDialogFormProps) => {
    if (!articleId) return;

    applyFieldChangesToEditor(articleId, {
      key: "headline",
      value: values.manualTranslation.headline,
    });
    applyFieldChangesToEditor(articleId, {
      key: "extra",
      value: {
        ...workingArticle?.extra,
        headline_extended: values.manualTranslation.headline_extended,
      },
    });
    applyFieldChangesToEditor(articleId, {
      key: "body_html",
      value: values.manualTranslation.body_html,
    });
    closeDialog();
  };

  const formik = useFormik<TranslationDialogFormProps>({
    initialValues: translationDialogFormInitialValues,
    onSubmit,
  });
  const { _id: articleId } = workingArticle;

  return (
    <Form onSubmit={formik.handleSubmit}>
      <Modal
        headerTemplate="Translate"
        visible
        size="x-large"
        onHide={closeDialog}
        footerTemplate={<Footer closeDialog={closeDialog} />}
      >
        <GridList margin="0">
          <Select value="Option 1" label="Select 1" onChange={() => {}}>
            <Option>Option 1</Option>
            <Option>Option 2</Option>
          </Select>
          <Select value="Option 2" label="Select 2" onChange={() => {}}>
            <Option>Option 1</Option>
            <Option>Option 2</Option>
          </Select>
          <Container className="items-end">
            <Button text="Translate" type="primary" onClick={() => {}} />
          </Container>
        </GridList>
        <ContentDivider />
        <ResizablePanels
          direction="horizontal"
          primarySize={{ min: 33, default: 50 }}
          secondarySize={{ min: 33, default: 50 }}
        >
          <Container gap="large" direction="column" className="mx-2">
            <div>
              <Select value="Original" label="Version" onChange={() => {}}>
                <Option>Original</Option>
                <Option>AI Translated</Option>
                <Option>Manual Translation</Option>
              </Select>
            </div>
            <TranslationForm key="origin" />
          </Container>
          <Container gap="large" direction="column" className="mx-2">
            <div>
              <Select value="AI Translated" label="Version" onChange={() => {}}>
                <Option>Original</Option>
                <Option>AI Translated</Option>
                <Option>Manual Translation</Option>
              </Select>
            </div>
            <TranslationForm key="aiTranslation" />
          </Container>
        </ResizablePanels>
      </Modal>
    </Form>
  );
};
