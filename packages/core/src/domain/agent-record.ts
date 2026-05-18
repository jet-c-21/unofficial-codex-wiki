export type AgentDocPageRecord = {
  recordType: "page";
  id: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  markdownSourceUrl?: string;
  localMarkdownPath: string;
  content: string;
  contentType: "markdown";
  contentHash: string;
  fetchedAt: string;
  headings: string[];
  links: Array<{
    text: string;
    originalHref: string;
    localHref: string | null;
    type: "internal" | "external" | "anchor" | "asset";
  }>;
};

export type AgentDocChunkRecord = {
  recordType: "chunk";
  id: string;
  pageId: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  localMarkdownPath: string;
  headingPath: string[];
  content: string;
  contentType: "markdown";
  chunkIndex: number;
  contentHash: string;
  fetchedAt: string;
};
