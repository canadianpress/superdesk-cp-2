import { useField } from "formik";
import * as React from "react";
import { InputWrapper } from "superdesk-ui-framework/react";
import { useSuperdesk } from "../context";
import { RecursiveKeyOf } from "../formik-utilties";

type TextEditorInputProps = {
  label: string;
  value: string;
  wrapperValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  maxLength?: number;
};

export const TextEditorInput = ({
  label,
  value,
  wrapperValue,
  readOnly,
  onChange,
  maxLength,
}: TextEditorInputProps) => {
  const superdesk = useSuperdesk(),
    { Editor3Html } = superdesk.components;

  return (
    <InputWrapper
      fullWidth
      boxedStyle
      boxedLable
      label={label}
      value={wrapperValue}
      // max length must be provided to show a character count
      maxLength={maxLength}
    >
      <Editor3Html readOnly={readOnly} value={value} onChange={onChange} />
    </InputWrapper>
  );
};

type FormTextEditorInputProps<T> = Omit<
  TextEditorInputProps,
  "value" | "wrapperValue" | "onChange"
> & {
  name: RecursiveKeyOf<T> & string;
  maxLength?: number;
};

export const FormTextEditorInput = <T,>({
  name,
  ...props
}: FormTextEditorInputProps<T>) => {
  const superdesk = useSuperdesk(),
    { stripHtmlTags } = superdesk.utilities,
    [field, _, helpers] = useField({ name }),
    { setValue } = helpers;

  return (
    <TextEditorInput
      value={field.value}
      wrapperValue={stripHtmlTags(field.value).replace(/\n/g, "")}
      onChange={(value) => {
        setValue(value);
      }}
      {...props}
    />
  );
};
