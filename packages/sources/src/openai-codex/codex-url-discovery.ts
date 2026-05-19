import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";
import { parseCodexLlmsTxt } from "./codex-llms-parser.js";

export type CodexDiscoveryPage = {
  id: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  markdownSourceUrl: string;
  description?: string;
};

export type CodexDiscoveryOutput = {
  source: string;
  discoveredAt: string;
  pageCount: number;
  urls: string[];
  pages?: CodexDiscoveryPage[];
  coverageReference?: {
    source: string;
    checkedAt: string;
    pageCount: number;
    urls: string[];
  };
};

export function createCodexDiscoveryOutput(content: string, discoveredAt: string): CodexDiscoveryOutput {
  const links = parseCodexLlmsTxt(content);
  const pages = links.map((link) => ({
    id: link.id,
    title: link.title,
    sourceUrl: link.canonicalUrl,
    canonicalUrl: link.canonicalUrl,
    markdownSourceUrl: link.markdownSourceUrl,
    ...(link.description === undefined ? {} : { description: link.description })
  }));

  return {
    source: openAiCodexSourceConfig.discoveryUrl,
    discoveredAt,
    pageCount: links.length,
    urls: links.map((link) => link.markdownSourceUrl),
    pages
  };
}
