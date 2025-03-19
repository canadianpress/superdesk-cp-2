import { useField } from "formik";
import * as React from "react";
import { InputWrapper } from "superdesk-ui-framework/react";
import { RecursiveKeyOf } from "../formik-utilties";
import { superdesk } from "../superdesk";

type TextEditorInputProps = {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
};

export const TextEditorInput = ({
  label,
  value,
  readOnly,
  onChange,
}: TextEditorInputProps) => {
  const { Editor3Html } = superdesk.components;

  return (
    <InputWrapper
      fullWidth
      boxedStyle
      boxedLable
      label={label}
      value={value}
      // max length must be provided to show a character count
      maxLength={Number.MAX_SAFE_INTEGER}
    >
      <Editor3Html readOnly={readOnly} value={value} onChange={onChange} />
    </InputWrapper>
  );
};

type FormTextEditorInputProps<T> = Omit<
  TextEditorInputProps,
  "value" | "onChange"
> & {
  name: RecursiveKeyOf<T> & string;
};

export const FormTextEditorInput = <T,>({
  name,
  ...props
}: FormTextEditorInputProps<T>) => {
  const [field, _, helpers] = useField({ name });
  const { setValue } = helpers;

  return (
    <TextEditorInput
      value={field.value}
      onChange={(value) => {
        setValue(value);
      }}
      {...props}
    />
  );
};
