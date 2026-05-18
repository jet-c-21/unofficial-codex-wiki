import { safeCrawlerPolicy } from "@unofficial-codex-wiki/config";
import { describe, expect, it } from "vitest";
import { summarizeValidationIssues } from "./validation-report.js";
import { validateMirror } from "./validator.js";

describe("validateMirror", () => {
  it("passes a complete local mirror slice", () => {
    const report = validateMirror({
      validatedAt: "2026-05-19T00:00:00.000Z",
      discovery: {
        source: "https://developers.openai.com/codex/llms.txt",
        discoveredAt: "2026-05-19T00:00:00.000Z",
        pageCount: 1,
        urls: ["https://developers.openai.com/codex/cli.md"]
      },
      manifest: {
        generatedAt: "2026-05-19T00:00:00.000Z",
        source: "https://developers.openai.com/codex/llms.txt",
        pageCount: 1,
        pages: [{
          id: "cli",
          title: "Codex CLI",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          localJsonlChunkIds: ["cli#chunk-1"],
          contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          fetchedAt: "2026-05-19T00:00:00.000Z",
          status: "new"
        }]
      },
      generatedMarkdownPages: [{
        localMarkdownPath: "generated/markdown/codex/cli.md",
        content: [
          "---",
          'title: "Codex CLI"',
          'source_url: "https://developers.openai.com/codex/cli"',
          'canonical_url: "https://developers.openai.com/codex/cli"',
          'local_path: "generated/markdown/codex/cli.md"',
          'fetched_at: "2026-05-19T00:00:00.000Z"',
          'content_hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111"',
          "unofficial_local_mirror: true",
          "---",
          "# Codex CLI",
          "",
          "See [Usage](#usage) and [OpenAI](https://openai.com).",
          "",
          "## Usage"
        ].join("\n")
      }],
      pageRecords: [{
        recordType: "page",
        id: "cli",
        title: "Codex CLI",
        sourceUrl: "https://developers.openai.com/codex/cli",
        canonicalUrl: "https://developers.openai.com/codex/cli",
        markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
        localMarkdownPath: "generated/markdown/codex/cli.md",
        content: "# Codex CLI\n",
        contentType: "markdown",
        contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        fetchedAt: "2026-05-19T00:00:00.000Z",
        headings: ["Codex CLI"],
        links: []
      }],
      chunkRecords: [{
        recordType: "chunk",
        id: "cli#chunk-1",
        pageId: "cli",
        title: "Codex CLI",
        sourceUrl: "https://developers.openai.com/codex/cli",
        canonicalUrl: "https://developers.openai.com/codex/cli",
        localMarkdownPath: "generated/markdown/codex/cli.md",
        headingPath: ["Codex CLI"],
        content: "# Codex CLI\n",
        contentType: "markdown",
        chunkIndex: 0,
        contentHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        fetchedAt: "2026-05-19T00:00:00.000Z"
      }],
      agentManifest: {
        generatedAt: "2026-05-19T00:00:00.000Z",
        pageCount: 1,
        chunkCount: 1,
        pages: [{
          id: "cli",
          title: "Codex CLI",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          localJsonlChunkIds: ["cli#chunk-1"]
        }]
      },
      searchSqliteExists: true,
      knownSearchResultCount: 1,
      defaultCrawlerPolicy: safeCrawlerPolicy
    });

    expect(report.ok).toBe(true);
    expect(report.errorCount).toBe(0);
  });

  it("fails on missing generated output and unsafe crawler settings", () => {
    const report = validateMirror({
      validatedAt: "2026-05-19T00:00:00.000Z",
      discovery: null,
      manifest: null,
      generatedMarkdownPages: [],
      pageRecords: [],
      chunkRecords: [],
      agentManifest: null,
      searchSqliteExists: false,
      knownSearchResultCount: 0,
      defaultCrawlerPolicy: {
        ...safeCrawlerPolicy,
        profile: "balanced",
        maxConcurrentPageRequestsPerHost: 2
      }
    });

    expect(report.ok).toBe(false);
    expect(report.checks.flatMap((check) => check.issues).map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "missing-discovery",
      "missing-manifest",
      "unsafe-default-profile",
      "unsafe-page-concurrency",
      "missing-search-sqlite"
    ]));
  });

  it("accepts explicit HTML anchors, JSX headings, and preserved Codex resources", () => {
    const report = validateMirror(createSinglePageValidationInput([
      "# Codex CLI",
      "",
      "See [Network](#network-access), [Credits](#credits-overview), [Image limits](#image-generation-usage-limits), and [Program terms](https://developers.openai.com/codex/codex-for-oss-terms).",
      "",
      "![Recommended findings](https://developers.openai.com/codex/security/images/aardvark_recommended_findings.png)",
      "",
      "## Network access <ElevatedRiskBadge class=\"ml-2\" />",
      "",
      "<a id=\"image-generation-usage-limits\"></a>",
      "",
      "### Image generation limits",
      "",
      "<div id=\"credits-overview\">",
      "Credit details.",
      "</div>"
    ].join("\n")));

    expect(report.ok).toBe(true);
  });

  it("still fails on missing anchors", () => {
    const report = validateMirror(createSinglePageValidationInput([
      "# Codex CLI",
      "",
      "See [Missing](#missing-anchor)."
    ].join("\n")));

    expect(report.ok).toBe(false);
    expect(report.checks.flatMap((check) => check.issues)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing-anchor-target"
      })
    ]));
  });

  it("groups validation issues for CLI failure summaries", () => {
    const report = validateMirror(createSinglePageValidationInput([
      "# Codex CLI",
      "",
      "See [Missing](#missing-anchor) and [Other missing](#other-missing)."
    ].join("\n")));

    expect(summarizeValidationIssues(report)).toEqual([
      expect.objectContaining({
        code: "missing-anchor-target",
        severity: "error",
        count: 2,
        checks: ["links-and-anchors"],
        examplePaths: ["generated/markdown/codex/cli.md"]
      })
    ]);
  });
});

function createSinglePageValidationInput(markdownBody: string): Parameters<typeof validateMirror>[0] {
  const contentHash = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
  const fetchedAt = "2026-05-19T00:00:00.000Z";
  const localMarkdownPath = "generated/markdown/codex/cli.md";
  const sourceUrl = "https://developers.openai.com/codex/cli";
  const canonicalUrl = "https://developers.openai.com/codex/cli";
  const markdownSourceUrl = "https://developers.openai.com/codex/cli.md";
  const content = [
    "---",
    'title: "Codex CLI"',
    `source_url: "${sourceUrl}"`,
    `canonical_url: "${canonicalUrl}"`,
    `local_path: "${localMarkdownPath}"`,
    `fetched_at: "${fetchedAt}"`,
    `content_hash: "${contentHash}"`,
    "unofficial_local_mirror: true",
    "---",
    markdownBody
  ].join("\n");

  return {
    validatedAt: fetchedAt,
    discovery: {
      source: "https://developers.openai.com/codex/llms.txt",
      discoveredAt: fetchedAt,
      pageCount: 1,
      urls: [markdownSourceUrl]
    },
    manifest: {
      generatedAt: fetchedAt,
      source: "https://developers.openai.com/codex/llms.txt",
      pageCount: 1,
      pages: [{
        id: "cli",
        title: "Codex CLI",
        sourceUrl,
        canonicalUrl,
        markdownSourceUrl,
        localMarkdownPath,
        localJsonlChunkIds: ["cli#chunk-1"],
        contentHash,
        fetchedAt,
        status: "new"
      }]
    },
    generatedMarkdownPages: [{
      localMarkdownPath,
      content
    }],
    pageRecords: [{
      recordType: "page",
      id: "cli",
      title: "Codex CLI",
      sourceUrl,
      canonicalUrl,
      markdownSourceUrl,
      localMarkdownPath,
      content: markdownBody,
      contentType: "markdown",
      contentHash,
      fetchedAt,
      headings: ["Codex CLI"],
      links: []
    }],
    chunkRecords: [{
      recordType: "chunk",
      id: "cli#chunk-1",
      pageId: "cli",
      title: "Codex CLI",
      sourceUrl,
      canonicalUrl,
      localMarkdownPath,
      headingPath: ["Codex CLI"],
      content: markdownBody,
      contentType: "markdown",
      chunkIndex: 0,
      contentHash,
      fetchedAt
    }],
    agentManifest: {
      generatedAt: fetchedAt,
      pageCount: 1,
      chunkCount: 1,
      pages: [{
        id: "cli",
        title: "Codex CLI",
        sourceUrl,
        canonicalUrl,
        localMarkdownPath,
        localJsonlChunkIds: ["cli#chunk-1"]
      }]
    },
    searchSqliteExists: true,
    knownSearchResultCount: 1,
    defaultCrawlerPolicy: safeCrawlerPolicy
  };
}
