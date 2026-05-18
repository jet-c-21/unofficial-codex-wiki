import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";

export type CodexUrlKind = "page" | "support";

export type NormalizedCodexUrl = {
  id: string;
  canonicalUrl: string;
  markdownSourceUrl: string;
  pathname: string;
  section?: string;
};

const supportPathnames = new Set(["/codex/llms.txt", "/codex/llms-full.txt"]);

export function toAbsoluteCodexUrl(input: string): URL {
  return new URL(input, openAiCodexSourceConfig.rootUrl);
}

export function isAllowedCodexUrl(input: string, options: { includeSupport?: boolean } = {}): boolean {
  try {
    const url = toAbsoluteCodexUrl(input);
    if (url.hostname !== openAiCodexSourceConfig.host) {
      return false;
    }

    const pathname = normalizePathname(url.pathname);
    if (options.includeSupport === true && supportPathnames.has(pathname)) {
      return true;
    }

    if (supportPathnames.has(pathname)) {
      return false;
    }

    return pathname === "/codex" || pathname.startsWith(`${openAiCodexSourceConfig.allowedPathPrefix}/`);
  } catch {
    return false;
  }
}

export function normalizeCodexPageUrl(input: string): NormalizedCodexUrl {
  const url = toAbsoluteCodexUrl(input);
  const pathname = normalizePathname(url.pathname);

  if (!isAllowedCodexUrl(url.toString())) {
    throw new Error(`Out-of-scope Codex page URL: ${input}`);
  }

  const pagePathname = stripMarkdownExtension(pathname);
  const id = pagePathname === "/codex" ? "codex" : pagePathname.replace(/^\/codex\//u, "");
  const canonicalUrl = `${openAiCodexSourceConfig.rootUrl}${pagePathname === "/codex" ? "" : pagePathname.slice("/codex".length)}`;
  const markdownSourceUrl = `${canonicalUrl}.md`;
  const section = id === "codex" ? undefined : id.split("/")[0];

  const normalized: NormalizedCodexUrl = {
    id,
    canonicalUrl,
    markdownSourceUrl,
    pathname: pagePathname
  };

  if (section !== undefined) {
    normalized.section = section;
  }

  return normalized;
}

export function normalizeCodexMarkdownSourceUrl(input: string): string {
  return normalizeCodexPageUrl(input).markdownSourceUrl;
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/+/gu, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/$/u, "") : collapsed;
}

function stripMarkdownExtension(pathname: string): string {
  return pathname.endsWith(".md") ? pathname.slice(0, -3) : pathname;
}
