import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";
import { parseCodexLlmsTxt } from "./codex-llms-parser.js";

export type CodexDiscoveryOutput = {
  source: string;
  discoveredAt: string;
  pageCount: number;
  urls: string[];
};

export function createCodexDiscoveryOutput(content: string, discoveredAt: string): CodexDiscoveryOutput {
  const links = parseCodexLlmsTxt(content);

  return {
    source: openAiCodexSourceConfig.discoveryUrl,
    discoveredAt,
    pageCount: links.length,
    urls: links.map((link) => link.markdownSourceUrl)
  };
}
