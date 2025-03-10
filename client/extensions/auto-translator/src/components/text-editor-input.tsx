import { FieldMetaProps, FieldValidator, useField } from "formik";
import * as React from "react";
import { InputWrapper } from "superdesk-ui-framework/react";
import { RecursiveKeyOf } from "../formik-utilties";
import { superdesk } from "../superdesk";

type TextEditorInputProps<T> = {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  error?: FieldMetaProps<T>["error"];
  maxLength?: number;
};

export const TextEditorInput = <T,>({
  label,
  value,
  error,
  maxLength,
  readOnly,
  onChange,
}: TextEditorInputProps<T>) => {
  const { Editor3Html } = superdesk.components;

  return (
    <InputWrapper
      fullWidth
      boxedStyle
      boxedLable
      label={label}
      value={value}
      error={error}
      invalid={Boolean(error)}
      maxLength={maxLength}
    >
      <Editor3Html readOnly={readOnly} value={value} onChange={onChange} />
    </InputWrapper>
  );
};

type FormTextEditorInputProps<T> = Omit<
  TextEditorInputProps<T>,
  "value" | "onChange"
> & {
  name: RecursiveKeyOf<T> & string;
  validate: FieldValidator | undefined;
};

export const FormTextEditorInput = <T,>({
  name,
  validate,
  ...props
}: FormTextEditorInputProps<T>) => {
  const [field, meta, helpers] = useField({ name, validate });
  const { setValue } = helpers;

  return (
    <TextEditorInput
      value={field.value}
      onChange={(value) => {
        setValue(value);
      }}
      error={meta.error}
      {...props}
    />
  );
};
