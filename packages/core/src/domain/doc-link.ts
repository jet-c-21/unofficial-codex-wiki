export type DocLinkType = "internal" | "external" | "anchor" | "asset";

export type DocLink = {
  text: string;
  originalHref: string;
  localHref: string | null;
  type: DocLinkType;
  resolved: boolean;
};
