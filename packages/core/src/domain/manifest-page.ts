export type ManifestPageStatus = "new" | "changed" | "unchanged" | "removed" | "failed";

export type ManifestPage = {
  id: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  markdownSourceUrl?: string;
  localMarkdownPath: string;
  localRawMarkdownPath?: string;
  localRawHtmlPath?: string;
  localJsonlChunkIds: string[];
  section?: string;
  contentHash: string;
  fetchedAt: string;
  status: ManifestPageStatus;
  failureReason?: string;
};
