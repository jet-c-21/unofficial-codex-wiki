import { normalizeCodexPageUrl, type NormalizedCodexUrl } from "./codex-url-rules.js";

const markdownLinkPattern = /\[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.+))?/u;

export type ParsedCodexLink = NormalizedCodexUrl & {
  title: string;
  description?: string;
};

export function parseCodexLlmsTxt(content: string): ParsedCodexLink[] {
  const seenCanonicalUrls = new Set<string>();
  const links: ParsedCodexLink[] = [];

  for (const line of content.split("\n")) {
    const match = line.match(markdownLinkPattern);
    if (match === null) {
      continue;
    }

    const title = match[1]?.trim();
    const href = match[2]?.trim();
    const description = normalizeDescription(match[3]);

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
        title,
        ...(description === undefined ? {} : { description })
      });
    } catch {
      continue;
    }
  }

  return links;
}

function normalizeDescription(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/gu, " ");
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}
