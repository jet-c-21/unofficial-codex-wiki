import type { HttpFetchClient } from "@unofficial-codex-wiki/crawler";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPipelineContext } from "../pipeline-context.js";
import { runFetchStep } from "./fetch.step.js";

describe("runFetchStep", () => {
  it("fetches discovered Markdown pages", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-fetch-"));
    try {
      await writeDiscovery(projectRoot);
      const httpClient: HttpFetchClient = async (url) => ({ url, status: 200, headers: {}, body: "# CLI" });
      const report = await runFetchStep(createPipelineContext({
        projectRoot,
        httpClient,
        delay: async () => undefined
      }));

      expect(report.pages).toEqual([{
        url: "https://developers.openai.com/codex/cli.md",
        sourceType: "markdown",
        localRawMarkdownPath: "data/latest/raw-markdown/cli.md",
        status: "fetched"
      }]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("makes zero network calls in offline mode and fails on missing raw Markdown", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-fetch-"));
    try {
      await writeDiscovery(projectRoot);
      let calls = 0;
      await expect(runFetchStep(createPipelineContext({
        projectRoot,
        offline: true,
        httpClient: async (url) => {
          calls += 1;
          return { url, status: 200, headers: {}, body: "# CLI" };
        },
        delay: async () => undefined
      }))).rejects.toThrow(/Fetch failed/u);
      expect(calls).toBe(0);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("fetches discovered use-case pages as raw HTML", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-fetch-"));
    try {
      await writeDiscovery(projectRoot, ["https://developers.openai.com/codex/use-cases/github-code-reviews"]);
      const httpClient: HttpFetchClient = async (url) => ({ url, status: 200, headers: {}, body: "<main><h1>GitHub code reviews</h1></main>" });
      const report = await runFetchStep(createPipelineContext({
        projectRoot,
        httpClient,
        delay: async () => undefined
      }));

      expect(report.pages).toEqual([{
        url: "https://developers.openai.com/codex/use-cases/github-code-reviews",
        sourceType: "html",
        localRawHtmlPath: "data/latest/raw-html/use-cases/github-code-reviews.html",
        status: "fetched"
      }]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

async function writeDiscovery(projectRoot: string, urls = ["https://developers.openai.com/codex/cli.md"]): Promise<void> {
  const discoveryDir = path.join(projectRoot, "data", "latest", "discovery");
  await mkdir(discoveryDir, { recursive: true });
  await writeFile(path.join(discoveryDir, "openai-codex.urls.json"), JSON.stringify({
    source: "https://developers.openai.com/codex/llms.txt",
    discoveredAt: "2026-05-19T00:00:00.000Z",
    pageCount: urls.length,
    urls
  }), "utf8");
}
