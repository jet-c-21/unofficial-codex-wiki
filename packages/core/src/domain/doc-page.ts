import type { Sha256Hash } from "./content-hash.js";
import type { DocAsset } from "./doc-asset.js";
import type { DocLink } from "./doc-link.js";
import type { DocHeading } from "./doc-section.js";

export type SourceUrl = string;
export type LocalPath = string;
export type IsoDateTime = string;

export type DocPage = {
  id: string;
  title: string;
  description?: string;
  sourceUrl: SourceUrl;
  canonicalUrl: SourceUrl;
  markdownSourceUrl?: SourceUrl;
  localMarkdownPath: LocalPath;
  localRawMarkdownPath?: LocalPath;
  localRawHtmlPath?: LocalPath;
  section?: string;
  contentHash: Sha256Hash;
  fetchedAt: IsoDateTime;
  headings: DocHeading[];
  links: DocLink[];
  assets: DocAsset[];
};
