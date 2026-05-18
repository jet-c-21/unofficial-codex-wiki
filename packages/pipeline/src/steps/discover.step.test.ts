import type { HttpFetchClient } from "@unofficial-codex-wiki/crawler";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPipelineContext } from "../pipeline-context.js";
import { runDiscoverStep } from "./discover.step.js";

const llmsText = `
# Codex
- [CLI](https://developers.openai.com/codex/cli.md): Terminal client
`;

const useCasesHtml = `
<main>
  <h1>Codex Use Cases</h1>
  <a href="/codex/use-cases/collections/production-systems">Production systems</a>
  <a href="/codex/use-cases/github-code-reviews">GitHub code reviews</a>
</main>
`;

describe("runDiscoverStep", () => {
  it("writes discovery output from llms.txt", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-discover-"));
    try {
      const httpClient: HttpFetchClient = async (url) => ({
        url,
        status: 200,
        headers: {},
        body: url.endsWith("/codex/use-cases") ? useCasesHtml : llmsText
      });
      const result = await runDiscoverStep(createPipelineContext({
        projectRoot,
        httpClient,
        delay: async () => undefined
      }));

      expect(result.discovery.urls).toEqual([
        "https://developers.openai.com/codex/cli.md",
        "https://developers.openai.com/codex/use-cases",
        "https://developers.openai.com/codex/use-cases/collections/production-systems",
        "https://developers.openai.com/codex/use-cases/github-code-reviews"
      ]);
      expect(result.fromCache).toBe(false);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("fails offline when discovery output is missing", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-discover-"));
    try {
      let calls = 0;
      await expect(runDiscoverStep(createPipelineContext({
        projectRoot,
        offline: true,
        httpClient: async (url) => {
          calls += 1;
          return { url, status: 200, headers: {}, body: llmsText };
        },
        delay: async () => undefined
      }))).rejects.toThrow(/Offline discovery cache miss/u);
      expect(calls).toBe(0);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
