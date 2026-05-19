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

  if (input.discovery !== null) {
    if (input.discovery.pageCount !== input.discovery.urls.length) {
      issues.push(error("discovery-page-count-mismatch", `Discovery pageCount (${input.discovery.pageCount}) does not match URL count (${input.discovery.urls.length}).`, "data/latest/discovery/openai-codex.urls.json"));
    }
    if (input.discovery.pages !== undefined && input.discovery.pages.length !== input.discovery.urls.length) {
      issues.push(error("discovery-page-metadata-count-mismatch", `Discovery pages metadata count (${input.discovery.pages.length}) does not match URL count (${input.discovery.urls.length}).`, "data/latest/discovery/openai-codex.urls.json"));
    }
    if (input.discovery.coverageReference !== undefined && input.discovery.coverageReference.pageCount !== input.discovery.coverageReference.urls.length) {
      issues.push(error("coverage-reference-count-mismatch", `Coverage reference pageCount (${input.discovery.coverageReference.pageCount}) does not match URL count (${input.discovery.coverageReference.urls.length}).`, "data/latest/discovery/openai-codex.urls.json"));
    }
  }

  if (input.manifest.pageCount !== input.manifest.pages.length) {
    issues.push(error("manifest-page-count-mismatch", `Manifest pageCount (${input.manifest.pageCount}) does not match page list count (${input.manifest.pages.length}).`, "data/latest/manifest.json"));
  }

  const manifestCanonicalUrls = new Set(input.manifest.pages.map((page) => page.canonicalUrl));
  for (const url of input.discovery?.urls ?? []) {
    if (!manifestCanonicalUrls.has(normalizeCodexPageUrl(url).canonicalUrl)) {
      issues.push(error("missing-manifest-page", `Discovered URL is missing from manifest: ${url}`));
    }
  }

  for (const url of input.discovery?.coverageReference?.urls ?? []) {
    if (!manifestCanonicalUrls.has(normalizeCodexPageUrl(url).canonicalUrl)) {
      issues.push(error("missing-coverage-reference-page", `Coverage reference URL is missing from manifest: ${url}`, "data/latest/discovery/openai-codex.urls.json"));
    }
  }

  pushDuplicateIdIssues(issues, input.manifest.pages.map((page) => page.id), "duplicate-manifest-page-id", "Manifest contains a duplicate page id.", "data/latest/manifest.json");
  pushDuplicateIdIssues(issues, input.pageRecords.map((record) => record.id), "duplicate-jsonl-page-id", "JSONL page records contain a duplicate page id.", "generated/agent/docs.pages.jsonl");
  pushDuplicateIdIssues(issues, input.chunkRecords.map((record) => record.id), "duplicate-jsonl-chunk-id", "JSONL chunk records contain a duplicate chunk id.", "generated/agent/docs.chunks.jsonl");

  const eligibleManifestPages = input.manifest.pages.filter((page) => page.status !== "failed" && page.status !== "removed");
  if (input.pageRecords.length !== eligibleManifestPages.length) {
    issues.push(error("agent-page-count-mismatch", `Agent page record count (${input.pageRecords.length}) does not match generated manifest page count (${eligibleManifestPages.length}).`, "generated/agent/docs.pages.jsonl"));
  }

  const pageRecordsById = new Map(input.pageRecords.map((record) => [record.id, record]));
  const chunkRecordsById = new Map(input.chunkRecords.map((record) => [record.id, record]));
  const chunkRecordIdsByPage = groupChunkIdsByPage(input.chunkRecords);
  const generatedMarkdownByPath = new Map(input.generatedMarkdownPages.map((page) => [page.localMarkdownPath, page.content]));
  const agentManifestPagesById = new Map(input.agentManifest?.pages.map((page) => [page.id, page]) ?? []);

  for (const page of input.manifest.pages) {
    if (page.status === "failed" || page.status === "removed") {
      continue;
    }

    if (!generatedMarkdownByPath.has(page.localMarkdownPath)) {
      issues.push(error("missing-generated-markdown", `Generated Markdown is missing for page: ${page.id}`, page.localMarkdownPath));
    }

    const pageRecord = pageRecordsById.get(page.id);
    if (pageRecord === undefined) {
      issues.push(error("missing-jsonl-page", `JSONL page record is missing for page: ${page.id}`, "generated/agent/docs.pages.jsonl"));
    } else {
      if (pageRecord.localMarkdownPath !== page.localMarkdownPath || pageRecord.canonicalUrl !== page.canonicalUrl) {
        issues.push(error("jsonl-page-metadata-mismatch", `JSONL page metadata does not match manifest for page: ${page.id}`, "generated/agent/docs.pages.jsonl"));
      }
      if (pageRecord.contentHash !== page.contentHash) {
        issues.push(error("jsonl-page-content-hash-mismatch", `JSONL page content hash does not match manifest for page: ${page.id}`, "generated/agent/docs.pages.jsonl"));
      }
    }

    const chunkIds = chunkRecordIdsByPage.get(page.id) ?? [];
    if (chunkIds.length === 0) {
      issues.push(error("missing-jsonl-chunks", `JSONL chunk records are missing for page: ${page.id}`, "generated/agent/docs.chunks.jsonl"));
    }

    if (page.localJsonlChunkIds.length !== chunkIds.length) {
      issues.push(error("manifest-chunk-count-mismatch", `Manifest chunk count (${page.localJsonlChunkIds.length}) does not match JSONL chunk count (${chunkIds.length}) for page: ${page.id}`, "data/latest/manifest.json"));
    }
    for (const chunkId of page.localJsonlChunkIds) {
      if (!chunkRecordsById.has(chunkId)) {
        issues.push(error("missing-manifest-chunk-reference", `Manifest references a missing JSONL chunk: ${chunkId}`, "data/latest/manifest.json"));
      }
    }

    const agentManifestPage = agentManifestPagesById.get(page.id);
    if (agentManifestPage === undefined) {
      issues.push(error("missing-agent-manifest-page", `Agent manifest page is missing for page: ${page.id}`, "generated/agent/docs.manifest.json"));
    } else if (agentManifestPage.localJsonlChunkIds.length !== chunkIds.length) {
      issues.push(error("agent-manifest-chunk-count-mismatch", `Agent manifest chunk count (${agentManifestPage.localJsonlChunkIds.length}) does not match JSONL chunk count (${chunkIds.length}) for page: ${page.id}`, "generated/agent/docs.manifest.json"));
    }
  }

  for (const chunk of input.chunkRecords) {
    if (!manifestCanonicalUrls.has(chunk.canonicalUrl)) {
      issues.push(error("jsonl-chunk-without-manifest-page", `JSONL chunk references a page outside the manifest: ${chunk.pageId}`, "generated/agent/docs.chunks.jsonl"));
    }
  }

  if (input.agentManifest === null) {
    issues.push(error("missing-agent-manifest", "Agent docs manifest is missing.", "generated/agent/docs.manifest.json"));
  } else {
    if (input.agentManifest.pageCount !== input.agentManifest.pages.length) {
      issues.push(error("agent-manifest-page-count-self-mismatch", `Agent manifest pageCount (${input.agentManifest.pageCount}) does not match page list count (${input.agentManifest.pages.length}).`, "generated/agent/docs.manifest.json"));
    }
    if (input.agentManifest.pageCount !== input.pageRecords.length) {
      issues.push(error("agent-manifest-page-count-mismatch", `Agent manifest pageCount (${input.agentManifest.pageCount}) does not match JSONL page count (${input.pageRecords.length}).`, "generated/agent/docs.manifest.json"));
    }
    if (input.agentManifest.chunkCount !== input.chunkRecords.length) {
      issues.push(error("agent-manifest-chunk-count-mismatch", `Agent manifest chunkCount (${input.agentManifest.chunkCount}) does not match JSONL chunk count (${input.chunkRecords.length}).`, "generated/agent/docs.manifest.json"));
    }
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
  const manifestByCanonicalUrl = new Map(input.manifest?.pages.map((page) => [page.canonicalUrl, page]) ?? []);

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

    const noise = getGeneratedMarkdownNoise(page.content);
    if (noise !== undefined) {
      issues.push(error("noisy-generated-markdown", `Generated Markdown still contains source UI/MDX wrapper noise: ${noise}`, page.localMarkdownPath));
    }
  }

  for (const record of input.pageRecords) {
    const manifestPage = manifestByCanonicalUrl.get(record.canonicalUrl);
    if (record.content.trim().length === 0) {
      issues.push(error("empty-jsonl-page-content", `JSONL page record is empty for page: ${record.id}`, "generated/agent/docs.pages.jsonl"));
    }
    if (manifestPage !== undefined && record.localMarkdownPath !== manifestPage.localMarkdownPath) {
      issues.push(error("jsonl-page-path-mismatch", `JSONL page path does not match manifest for page: ${record.id}`, "generated/agent/docs.pages.jsonl"));
    }
  }

  for (const record of input.chunkRecords) {
    if (record.content.trim().length === 0) {
      issues.push(error("empty-jsonl-chunk-content", `JSONL chunk record is empty: ${record.id}`, "generated/agent/docs.chunks.jsonl"));
    }
    const manifestPage = manifestByCanonicalUrl.get(record.canonicalUrl);
    if (manifestPage !== undefined && record.localMarkdownPath !== manifestPage.localMarkdownPath) {
      issues.push(error("jsonl-chunk-path-mismatch", `JSONL chunk path does not match manifest for chunk: ${record.id}`, "generated/agent/docs.chunks.jsonl"));
    }
  }

  return issues;
}

function getGeneratedMarkdownNoise(content: string): string | undefined {
  const visibleContent = stripFencedCodeBlocks(content);
  const patterns: Array<[RegExp, string]> = [
    [/<\/?(?:BentoContainer|BentoContent|LinkCard|CtaPillLink|PricingCard|ContentSwitcher|YouTubeEmbed|CliSetupSteps|CodexScreenshot|WorkflowSteps|ToggleSection|ExampleGallery|ExampleTask)\b/iu, "component wrapper"],
    [/<(?:div|section)\b[^>]*\bclass=["'][^"']+/iu, "layout HTML tag"],
    [/\bdata-(?:content-switcher|use-case)[A-Za-z0-9_-]*\b/iu, "source UI data attribute"],
    [/\b(?:astro-[A-Za-z0-9_-]+|prompt-scroll__content)\b/iu, "Astro UI artifact"],
    [/\bNo use cases match these filters\b/iu, "filter empty-state text"],
    [/\bExport as PDF\b/iu, "export control text"],
    [/\bTry in the Codex app\b/iu, "app CTA text"]
  ];

  for (const [pattern, label] of patterns) {
    if (pattern.test(visibleContent)) {
      return label;
    }
  }

  return undefined;
}

function stripFencedCodeBlocks(content: string): string {
  const lines: string[] = [];
  let inFence = false;

  for (const line of content.split("\n")) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      lines.push(line);
    }
  }

  return lines.join("\n");
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

function pushDuplicateIdIssues(
  issues: ValidationIssue[],
  ids: readonly string[],
  code: string,
  message: string,
  path: string
): void {
  const seen = new Set<string>();
  const reported = new Set<string>();

  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      continue;
    }

    if (!reported.has(id)) {
      issues.push(error(code, `${message} ${id}`, path));
      reported.add(id);
    }
  }
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
