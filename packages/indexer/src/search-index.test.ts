import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSearchIndex, searchIndex } from "./search-index.js";

describe("search index", () => {
  it("builds a SQLite FTS index and returns source-aware results", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-index-"));
    try {
      const sqlitePath = path.join(projectRoot, "generated", "search", "docs.sqlite");
      buildSearchIndex({
        sqlitePath,
        pages: [{
          recordType: "page",
          id: "cli",
          title: "Codex CLI",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          content: "# Codex CLI\n\nSandbox approvals.",
          contentType: "markdown",
          contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          fetchedAt: "2026-05-19T00:00:00.000Z",
          headings: ["Codex CLI"],
          links: []
        }],
        chunks: [{
          recordType: "chunk",
          id: "cli#chunk-1",
          pageId: "cli",
          title: "Codex CLI",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          headingPath: ["Codex CLI"],
          content: "# Codex CLI\n\nSandbox approvals keep local edits controlled.",
          contentType: "markdown",
          chunkIndex: 0,
          contentHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
          fetchedAt: "2026-05-19T00:00:00.000Z"
        }]
      });

      const results = searchIndex(sqlitePath, "sandbox approvals");

      expect(results).toEqual([expect.objectContaining({
        title: "Codex CLI",
        sourceUrl: "https://developers.openai.com/codex/cli",
        localMarkdownPath: "generated/markdown/codex/cli.md",
        headingPath: ["Codex CLI"],
        chunkId: "cli#chunk-1"
      })]);
      expect(results[0]?.snippet).toContain("[Sandbox]");
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
