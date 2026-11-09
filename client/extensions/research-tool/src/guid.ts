export const extractGuidFromUrl = (href: string) =>
  new URL(href).pathname.split("/").filter(Boolean).pop();
