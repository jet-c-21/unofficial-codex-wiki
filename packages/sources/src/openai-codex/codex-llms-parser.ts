import { normalizeCodexPageUrl, type NormalizedCodexUrl } from "./codex-url-rules.js";

const markdownLinkPattern = /\[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.+))?/u;
const codexUrlPattern = /https:\/\/developers\.openai\.com\/codex(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%-]+)*(?:\.md)?/giu;
const codexPathPattern = /(?<![A-Za-z0-9])\/codex(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%-]+)*(?:\.md)?/gu;

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

export function extractCodexCoverageReferenceUrls(content: string): string[] {
  const urlsByCanonicalUrl = new Map<string, string>();

  for (const rawUrl of [
    ...extractMarkdownHrefs(content),
    ...[...content.matchAll(codexUrlPattern)].map((match) => match[0]),
    ...[...content.matchAll(codexPathPattern)].map((match) => match[0])
  ]) {
    const url = normalizeCoverageReferenceCandidate(rawUrl);
    if (!isDocumentationPageReference(url)) {
      continue;
    }

    try {
      const normalized = normalizeCodexPageUrl(url);
      urlsByCanonicalUrl.set(normalized.canonicalUrl, normalized.markdownSourceUrl);
    } catch {
      continue;
    }
  }

  return [...urlsByCanonicalUrl.values()].sort((left, right) => {
    return normalizeCodexPageUrl(left).id.localeCompare(normalizeCodexPageUrl(right).id);
  });
}

function normalizeCoverageReferenceCandidate(rawUrl: string): string {
  let normalized = rawUrl.trim();
  while (/[),.;:]+$/u.test(normalized) && !normalized.endsWith(".md")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function isDocumentationPageReference(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, "https://developers.openai.com");
    return !/\.[a-z0-9]+$/iu.test(url.pathname) || url.pathname.endsWith(".md");
  } catch {
    return false;
  }
}

function extractMarkdownHrefs(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.match(markdownLinkPattern)?.[2]?.trim())
    .filter((href): href is string => href !== undefined && href.length > 0);
}

function normalizeDescription(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/gu, " ");
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}
