import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DocStorage } from "@unofficial-codex-wiki/storage";
import { createPipelineContext } from "../pipeline-context.js";
import { runChunkStep } from "./chunk.step.js";
import { runIndexStep } from "./index.step.js";
import { runReadStep } from "./read.step.js";
import { runSearchStep } from "./search.step.js";

describe("Milestone 4 pipeline steps", () => {
  it("writes JSONL records, builds the search index, searches, and reads local Markdown", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-m4-"));
    try {
      const storage = new DocStorage({ projectRoot });
      await storage.writeGeneratedMarkdown("generated/markdown/codex/cli.md", [
        "---",
        'title: "Codex CLI"',
        'description: "Terminal client for local Codex work."',
        'source_url: "https://developers.openai.com/codex/cli"',
        'canonical_url: "https://developers.openai.com/codex/cli"',
        'local_path: "generated/markdown/codex/cli.md"',
        'fetched_at: "2026-05-19T00:00:00.000Z"',
        'content_hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111"',
        'generated_by: "unofficial-codex-wiki"',
        "unofficial_local_mirror: true",
        "---",
        "# Codex CLI",
        "",
        "Terminal client for local Codex work.",
        "",
        "Sandbox approvals protect local edits.",
        "",
        "## Configure",
        "",
        "Use [settings](settings.md)."
      ].join("\n"));
      await storage.writeManifest({
        generatedAt: "2026-05-19T00:00:00.000Z",
        source: "https://developers.openai.com/codex/llms.txt",
        pageCount: 1,
        pages: [{
          id: "cli",
          title: "Codex CLI",
          description: "Terminal client for local Codex work.",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          localJsonlChunkIds: [],
          contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          fetchedAt: "2026-05-19T00:00:00.000Z",
          status: "new"
        }]
      }, "snapshot-transform");

      const context = createPipelineContext({ projectRoot });
      const chunkResult = await runChunkStep(context);
      const indexResult = await runIndexStep(context);
      const searchResult = await runSearchStep(context, { query: "sandbox approvals" });
      const descriptionSearchResult = await runSearchStep(context, { query: "Terminal client" });
      const readResult = await runReadStep(context, { pageOrSlug: "cli#configure" });

      expect(chunkResult.report).toMatchObject({
        pageCount: 1,
        chunkCount: 2
      });
      expect(indexResult.report.sqlitePath).toBe("generated/search/docs.sqlite");
      expect(searchResult.results[0]).toMatchObject({
        title: "Codex CLI",
        sourceUrl: "https://developers.openai.com/codex/cli",
        localMarkdownPath: "generated/markdown/codex/cli.md"
      });
      expect(descriptionSearchResult.results[0]).toMatchObject({
        title: "Codex CLI",
        chunkId: "cli#chunk-1"
      });
      expect(readResult.content).toBe("## Configure\n\nUse [settings](settings.md).\n");
      await expect(storage.readAgentPageRecords()).resolves.toHaveLength(1);
      await expect(storage.readAgentChunkRecords()).resolves.toHaveLength(2);
      await expect(storage.readLatestManifest()).resolves.toMatchObject({
        pages: [expect.objectContaining({
          localJsonlChunkIds: ["cli#chunk-1", "cli#chunk-2"]
        })]
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
