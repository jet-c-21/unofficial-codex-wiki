import type { CrawlerPolicy } from "@unofficial-codex-wiki/config";
import type { AgentDocChunkRecord, AgentDocPageRecord, ManifestPage } from "@unofficial-codex-wiki/core";
import { isAllowedCodexUrl, normalizeCodexPageUrl, type CodexDiscoveryOutput } from "@unofficial-codex-wiki/sources";
import type { AgentDocsManifest, DocsManifest } from "@unofficial-codex-wiki/storage";
import { parseFrontMatter } from "./frontmatter.js";
import { extractHeadingSlugs, extractMarkdownLinks, isExternalHref, resolveMarkdownHref } from "./markdown-links.js";
import { createCheck, createValidationReport, type ValidationIssue, type ValidationReport } from "./validation-report.js";

export type GeneratedMarkdownPage = {
  localMarkdownPath: string;
  content: string | null;
};

export type ValidationInput = {
  validatedAt: string;
  discovery: CodexDiscoveryOutput | null;
  manifest: DocsManifest | null;
  generatedMarkdownPages: readonly GeneratedMarkdownPage[];
  pageRecords: readonly AgentDocPageRecord[];
  chunkRecords: readonly AgentDocChunkRecord[];
  agentManifest: AgentDocsManifest | null;
  searchSqliteExists: boolean;
  knownSearchResultCount: number;
  defaultCrawlerPolicy: CrawlerPolicy;
};

export function validateMirror(input: ValidationInput): ValidationReport {
  return createValidationReport(input.validatedAt, [
    createCheck("coverage", validateCoverage(input)),
    createCheck("metadata", validateMetadata(input)),
    createCheck("links-and-anchors", validateLinksAndAnchors(input)),
    createCheck("assets", validateAssets(input)),
    createCheck("content-integrity", validateContentIntegrity(input)),
    createCheck("crawler-policy", validateCrawlerPolicy(input.defaultCrawlerPolicy)),
    createCheck("search", validateSearch(input))
  ]);
}

function validateCoverage(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (input.discovery === null) {
    issues.push(error("missing-discovery", "Discovery output is missing.", "data/latest/discovery/openai-codex.urls.json"));
  }
  if (input.manifest === null) {
    issues.push(error("missing-manifest", "Manifest is missing.", "data/latest/manifest.json"));
    return issues;
  }

  const manifestCanonicalUrls = new Set(input.manifest.pages.map((page) => page.canonicalUrl));
  for (const url of input.discovery?.urls ?? []) {
    if (!manifestCanonicalUrls.has(normalizeCodexPageUrl(url).canonicalUrl)) {
      issues.push(error("missing-manifest-page", `Discovered URL is missing from manifest: ${url}`));
    }
  }

  const pageRecordIds = new Set(input.pageRecords.map((record) => record.id));
  const chunkRecordIdsByPage = groupChunkIdsByPage(input.chunkRecords);
  const generatedMarkdownByPath = new Map(input.generatedMarkdownPages.map((page) => [page.localMarkdownPath, page.content]));

  for (const page of input.manifest.pages) {
    if (page.status === "failed" || page.status === "removed") {
      continue;
    }

    if (!generatedMarkdownByPath.has(page.localMarkdownPath)) {
      issues.push(error("missing-generated-markdown", `Generated Markdown is missing for page: ${page.id}`, page.localMarkdownPath));
    }

    if (!pageRecordIds.has(page.id)) {
      issues.push(error("missing-jsonl-page", `JSONL page record is missing for page: ${page.id}`, "generated/agent/docs.pages.jsonl"));
    }

    const chunkIds = chunkRecordIdsByPage.get(page.id) ?? [];
    if (chunkIds.length === 0) {
      issues.push(error("missing-jsonl-chunks", `JSONL chunk records are missing for page: ${page.id}`, "generated/agent/docs.chunks.jsonl"));
    }
  }

  if (input.agentManifest === null) {
    issues.push(error("missing-agent-manifest", "Agent docs manifest is missing.", "generated/agent/docs.manifest.json"));
  }

  return issues;
}

function validateMetadata(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFrontMatterKeys = ["title", "source_url", "canonical_url", "local_path", "fetched_at", "content_hash", "unofficial_local_mirror"];

  for (const page of input.generatedMarkdownPages) {
    if (page.content === null) {
      continue;
    }

    const frontMatter = parseFrontMatter(page.content);
    for (const key of requiredFrontMatterKeys) {
      if (frontMatter[key] === undefined) {
        issues.push(error("missing-frontmatter-key", `Generated Markdown is missing front matter key '${key}'.`, page.localMarkdownPath));
      }
    }

    if (frontMatter.unofficial_local_mirror !== true) {
      issues.push(error("missing-private-mirror-flag", "Generated Markdown must set unofficial_local_mirror: true.", page.localMarkdownPath));
    }
  }

  for (const record of input.pageRecords) {
    checkRequiredRecordFields(issues, record, ["sourceUrl", "canonicalUrl", "localMarkdownPath", "contentHash", "fetchedAt"], "generated/agent/docs.pages.jsonl");
  }

  for (const record of input.chunkRecords) {
    checkRequiredRecordFields(issues, record, ["sourceUrl", "canonicalUrl", "localMarkdownPath", "contentHash", "fetchedAt"], "generated/agent/docs.chunks.jsonl");
  }

  return issues;
}

function validateLinksAndAnchors(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const markdownByPath = new Map(input.generatedMarkdownPages.map((page) => [page.localMarkdownPath, page.content]));
  const headingSlugsByPath = new Map(input.generatedMarkdownPages.map((page) => [
    page.localMarkdownPath,
    page.content === null ? new Set<string>() : extractHeadingSlugs(page.content)
  ]));
  const mirroredCanonicalUrls = new Set(input.manifest?.pages.map((page) => page.canonicalUrl) ?? []);

  for (const page of input.generatedMarkdownPages) {
    if (page.content === null) {
      continue;
    }

    for (const link of extractMarkdownLinks(page.content)) {
      if (link.image) {
        continue;
      }

      if (isExternalHref(link.href)) {
        const codexIssue = getUnrewrittenCodexLinkIssue(link.href, mirroredCanonicalUrls, page.localMarkdownPath);
        if (codexIssue !== undefined) {
          issues.push(codexIssue);
        }
        continue;
      }

      const resolved = resolveMarkdownHref(page.localMarkdownPath, link.href);
      if (!markdownByPath.has(resolved.localPath)) {
        issues.push(error("missing-local-link-target", `Rewritten local link target is missing: ${link.href}`, page.localMarkdownPath));
        continue;
      }

      if (resolved.anchor !== undefined && resolved.anchor.length > 0) {
        const anchorSlug = decodeAnchor(resolved.anchor);
        if (!headingSlugsByPath.get(resolved.localPath)?.has(anchorSlug)) {
          issues.push(error("missing-anchor-target", `Anchor target is missing: ${link.href}`, page.localMarkdownPath));
        }
      }
    }
  }

  return issues;
}

function getUnrewrittenCodexLinkIssue(
  href: string,
  mirroredCanonicalUrls: ReadonlySet<string>,
  path: string
): ValidationIssue | undefined {
  if (!isCodexDocumentationHref(href)) {
    return undefined;
  }

  const normalized = normalizeCodexPageUrl(href);
  if (!mirroredCanonicalUrls.has(normalized.canonicalUrl)) {
    return error(
      "unresolved-internal-codex-link",
      `Internal Codex link is not in the mirror manifest and cannot be rewritten: ${href}`,
      path
    );
  }

  return error("unrewritten-internal-link", `Internal Codex link was not rewritten: ${href}`, path);
}

function isCodexDocumentationHref(href: string): boolean {
  if (!isAllowedCodexUrl(href)) {
    return false;
  }

  const url = new URL(href);
  if (knownNonDocumentationCodexPathnames.has(url.pathname)) {
    return false;
  }

  return !/\.[a-z0-9]+$/iu.test(url.pathname) || url.pathname.endsWith(".md");
}

const knownNonDocumentationCodexPathnames = new Set([
  "/codex/codex-for-oss-terms"
]);

function validateAssets(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const page of input.generatedMarkdownPages) {
    if (page.content === null) {
      continue;
    }

    for (const link of extractMarkdownLinks(page.content)) {
      if (!link.image || isExternalHref(link.href)) {
        continue;
      }

      if (/\.(css|js|mjs|woff2?|ttf|otf)(?:$|[?#])/iu.test(link.href)) {
        issues.push(error("disallowed-asset-type", `Disallowed generated asset type referenced: ${link.href}`, page.localMarkdownPath));
      }
    }
  }

  return issues;
}

function validateContentIntegrity(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const manifestByPath = new Map(input.manifest?.pages.map((page) => [page.localMarkdownPath, page]) ?? []);

  for (const page of input.generatedMarkdownPages) {
    const manifestPage = manifestByPath.get(page.localMarkdownPath);
    if (manifestPage?.status === "failed") {
      continue;
    }

    if (page.content === null || page.content.trim().length === 0) {
      issues.push(error("empty-generated-page", "Generated Markdown page is empty.", page.localMarkdownPath));
      continue;
    }

    if (!/^#\s+/mu.test(page.content)) {
      issues.push(error("missing-heading", "Generated Markdown page does not contain a top-level heading.", page.localMarkdownPath));
    }

    if (/AI-generated summary|AI generated summary|summary generated by AI/iu.test(page.content)) {
      issues.push(error("ai-summary-detected", "Generated Markdown appears to contain AI summary language.", page.localMarkdownPath));
    }
  }

  return issues;
}

function validateCrawlerPolicy(policy: CrawlerPolicy): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (policy.profile !== "safe") {
    issues.push(error("unsafe-default-profile", "Default crawler profile must be safe."));
  }
  if (policy.maxConcurrentPageRequestsPerHost > 1) {
    issues.push(error("unsafe-page-concurrency", "Default page concurrency must not exceed 1."));
  }
  if (policy.minDelayMsBetweenPageRequestsPerHost < 5_000) {
    issues.push(error("unsafe-page-delay", "Default page delay must be at least 5 seconds."));
  }
  if (policy.maxRequestsPerMinutePerHost > 10) {
    issues.push(error("unsafe-request-rate", "Default max requests per minute must not exceed 10."));
  }
  if (policy.maxRetries > 2) {
    issues.push(error("unsafe-retry-count", "Default retry count must not exceed 2."));
  }
  if (policy.crawlExternalLinks) {
    issues.push(error("external-link-crawling-enabled", "External link crawling must remain disabled."));
  }
  return issues;
}

function validateSearch(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.searchSqliteExists) {
    issues.push(error("missing-search-sqlite", "SQLite search index is missing.", "generated/search/docs.sqlite"));
  }
  if (input.chunkRecords.length > 0 && input.knownSearchResultCount === 0) {
    issues.push(error("known-search-empty", "Known local search query returned no results.", "generated/search/docs.sqlite"));
  }
  return issues;
}

function checkRequiredRecordFields(
  issues: ValidationIssue[],
  record: Record<string, unknown>,
  fields: readonly string[],
  path: string
): void {
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "string" || value.length === 0) {
      issues.push(error("missing-jsonl-metadata", `JSONL record is missing required field '${field}'.`, path));
    }
  }
}

function groupChunkIdsByPage(records: readonly AgentDocChunkRecord[]): Map<string, string[]> {
  const byPage = new Map<string, string[]>();
  for (const record of records) {
    byPage.set(record.pageId, [...(byPage.get(record.pageId) ?? []), record.id]);
  }
  return byPage;
}

function decodeAnchor(anchor: string): string {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor;
  }
}

function error(code: string, message: string, path?: string): ValidationIssue {
  const issue: ValidationIssue = {
    code,
    severity: "error",
    message
  };
  if (path !== undefined) {
    issue.path = path;
  }
  return issue;
}
