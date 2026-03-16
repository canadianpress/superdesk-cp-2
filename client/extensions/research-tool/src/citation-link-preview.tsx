import * as React from "react";

export const CitationLinkPreview = ({ href }: { href: any }) => {
  const url = new URL(href);
  const domain = url.hostname;
  const logoUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

  return (
    <a href={href}>
      <img src={logoUrl} alt={`${domain} logo`} />
      <span>{domain}</span>
    </a>
  );
};
