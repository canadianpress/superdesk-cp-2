import * as React from "react";
import BaseReactMarkdown, { Components } from "react-markdown";

const Img: Components["img"] = ({ node, ...props }) => (
  <img
    {...props}
    style={{ maxWidth: "100%", height: "auto", display: "block" }}
  />
);

export const ReactMarkdown = ({
  children,
  components,
}: {
  children: string;
  components?: Components;
}) => (
  <BaseReactMarkdown
    components={{ ...components, img: components?.img ?? Img }}
  >
    {children}
  </BaseReactMarkdown>
);
