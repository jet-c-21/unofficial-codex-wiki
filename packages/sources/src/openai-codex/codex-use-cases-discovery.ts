import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";
import { normalizeCodexPageUrl, toAbsoluteCodexUrl, type NormalizedCodexUrl } from "./codex-url-rules.js";

const hrefPattern = /\bhref=["']([^"']+)["']/giu;

export function parseCodexUseCasesHtml(content: string): NormalizedCodexUrl[] {
  const linksByCanonicalUrl = new Map<string, NormalizedCodexUrl>();

  for (const href of [
    openAiCodexSourceConfig.useCasesUrl,
    ...extractHrefValues(content)
  ]) {
    try {
      if (!isCodexUseCasesPageUrl(href)) {
        continue;
      }

      const normalized = normalizeCodexPageUrl(href);
      linksByCanonicalUrl.set(normalized.canonicalUrl, normalized);
    } catch {
      continue;
    }
  }

  return [...linksByCanonicalUrl.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function isCodexUseCasesPageUrl(input: string): boolean {
  try {
    const url = toAbsoluteCodexUrl(input);
    if (url.hostname !== openAiCodexSourceConfig.host) {
      return false;
    }

    const pathname = normalizePathname(url.pathname);
    const pagePathname = pathname.endsWith(".md") ? pathname.slice(0, -3) : pathname;
    if (/\.[a-z0-9]+$/iu.test(pagePathname)) {
      return false;
    }

    return pagePathname === "/codex/use-cases" || pagePathname.startsWith("/codex/use-cases/");
  } catch {
    return false;
  }
}

function extractHrefValues(content: string): string[] {
  return [...content.matchAll(hrefPattern)]
    .map((match) => match[1]?.trim())
    .filter((href): href is string => href !== undefined && href.length > 0);
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/+/gu, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/$/u, "") : collapsed;
}
