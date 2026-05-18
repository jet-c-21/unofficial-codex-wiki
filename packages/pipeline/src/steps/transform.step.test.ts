import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DocStorage } from "@unofficial-codex-wiki/storage";
import { createPipelineContext } from "../pipeline-context.js";
import { runTransformStep } from "./transform.step.js";

describe("runTransformStep", () => {
  it("writes generated Markdown and a latest manifest from fetched raw Markdown", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-transform-"));
    try {
      const storage = new DocStorage({ projectRoot });
      await storage.writeDiscoveryOutput({
        source: "https://developers.openai.com/codex/llms.txt",
        discoveredAt: "2026-05-19T00:00:00.000Z",
        pageCount: 2,
        urls: [
          "https://developers.openai.com/codex/cli.md",
          "https://developers.openai.com/codex/agents.md"
        ]
      }, "snapshot-discovery");
      await storage.createRawMarkdownCache("https://developers.openai.com/codex/cli.md").write("# CLI\n\nSee [Agents](/codex/agents).\n");
      await storage.createRawMarkdownCache("https://developers.openai.com/codex/agents.md").write("# Agents\n");
      await storage.writeFetchReport({
        fetchedAt: "2026-05-19T01:00:00.000Z",
        pageCount: 2,
        pages: [
          {
            url: "https://developers.openai.com/codex/cli.md",
            sourceType: "markdown",
            localRawMarkdownPath: "data/latest/raw-markdown/cli.md",
            status: "fetched"
          },
          {
            url: "https://developers.openai.com/codex/agents.md",
            sourceType: "markdown",
            localRawMarkdownPath: "data/latest/raw-markdown/agents.md",
            status: "fetched"
          }
        ]
      }, "snapshot-fetch");

      const result = await runTransformStep(createPipelineContext({ projectRoot }));
      const manifest = await storage.readLatestManifest();
      const cliMarkdown = await storage.readGeneratedMarkdown("generated/markdown/codex/cli.md");

      expect(result.report.generatedPageCount).toBe(2);
      expect(result.report.failedPageCount).toBe(0);
      expect(manifest.pages.map((page) => page.localMarkdownPath).sort()).toEqual([
        "generated/markdown/codex/agents.md",
        "generated/markdown/codex/cli.md"
      ]);
      expect(cliMarkdown).toContain('source_url: "https://developers.openai.com/codex/cli"');
      expect(cliMarkdown).toContain("See [Agents](agents.md).");
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("transforms fetched use-case HTML into generated Markdown", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-transform-"));
    try {
      const storage = new DocStorage({ projectRoot });
      await storage.writeDiscoveryOutput({
        source: "https://developers.openai.com/codex/llms.txt",
        discoveredAt: "2026-05-19T00:00:00.000Z",
        pageCount: 1,
        urls: ["https://developers.openai.com/codex/use-cases/github-code-reviews"]
      }, "snapshot-discovery");
      await storage.createRawHtmlCache("https://developers.openai.com/codex/use-cases/github-code-reviews").write(`
        <main>
          <h1>Codex code review for GitHub pull requests</h1>
          <p>Catch regressions before human review.</p>
          <h2 id="how-to-use">How to use</h2>
          <p>Open <a href="/codex/use-cases">all use cases</a>.</p>
        </main>
      `);
      await storage.writeFetchReport({
        fetchedAt: "2026-05-19T01:00:00.000Z",
        pageCount: 1,
        pages: [{
          url: "https://developers.openai.com/codex/use-cases/github-code-reviews",
          sourceType: "html",
          localRawHtmlPath: "data/latest/raw-html/use-cases/github-code-reviews.html",
          status: "fetched"
        }]
      }, "snapshot-fetch");

      const result = await runTransformStep(createPipelineContext({ projectRoot }));
      const markdown = await storage.readGeneratedMarkdown("generated/markdown/codex/use-cases/github-code-reviews.md");

      expect(result.report.generatedPageCount).toBe(1);
      expect(markdown).toContain('source_url: "https://developers.openai.com/codex/use-cases/github-code-reviews"');
      expect(markdown).toContain("# Codex code review for GitHub pull requests");
      expect(markdown).toContain("## How to use {#how-to-use}");
      expect(result.manifest.pages[0]).toMatchObject({
        localRawHtmlPath: "data/latest/raw-html/use-cases/github-code-reviews.html"
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("writes failed manifest pages when raw Markdown is missing", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-transform-"));
    try {
      const storage = new DocStorage({ projectRoot });
      await storage.writeDiscoveryOutput({
        source: "https://developers.openai.com/codex/llms.txt",
        discoveredAt: "2026-05-19T00:00:00.000Z",
        pageCount: 1,
        urls: ["https://developers.openai.com/codex/cli.md"]
      }, "snapshot-discovery");
      await storage.writeFetchReport({
        fetchedAt: "2026-05-19T01:00:00.000Z",
        pageCount: 1,
        pages: [{
          url: "https://developers.openai.com/codex/cli.md",
          sourceType: "markdown",
          localRawMarkdownPath: "data/latest/raw-markdown/cli.md",
          status: "fetched"
        }]
      }, "snapshot-fetch");

      await expect(runTransformStep(createPipelineContext({ projectRoot }))).rejects.toThrow(/Transform failed/u);
      await expect(storage.readLatestManifest()).resolves.toMatchObject({
        pageCount: 1,
        pages: [expect.objectContaining({
          status: "failed",
          failureReason: "Raw Markdown cache is missing at data/latest/raw-markdown/cli.md"
        })]
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
