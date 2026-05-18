import { normalizeCodexPageUrl, type NormalizedCodexUrl } from "./codex-url-rules.js";

const markdownLinkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/gu;

export type ParsedCodexLink = NormalizedCodexUrl & {
  title: string;
};

export function parseCodexLlmsTxt(content: string): ParsedCodexLink[] {
  const seenCanonicalUrls = new Set<string>();
  const links: ParsedCodexLink[] = [];

  for (const match of content.matchAll(markdownLinkPattern)) {
    const title = match[1]?.trim();
    const href = match[2]?.trim();

    if (title === undefined || href === undefined || !href.endsWith(".md")) {
      continue;
    }

    try {
      const normalized = normalizeCodexPageUrl(href);
      if (seenCanonicalUrls.has(normalized.canonicalUrl)) {
        continue;
      }

      seenCanonicalUrls.add(normalized.canonicalUrl);
      links.push({
        ...normalized,
        title
      });
    } catch {
      continue;
    }
  }

  return links;
}
