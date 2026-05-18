import type { Sha256Hash } from "./content-hash.js";
import type { IsoDateTime, LocalPath, SourceUrl } from "./doc-page.js";

export type DocChunk = {
  id: string;
  pageId: string;
  title: string;
  sourceUrl: SourceUrl;
  canonicalUrl: SourceUrl;
  localMarkdownPath: LocalPath;
  headingPath: string[];
  content: string;
  contentType: "markdown";
  chunkIndex: number;
  contentHash: Sha256Hash;
  fetchedAt: IsoDateTime;
};
