import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { HttpFetchClient } from "@unofficial-codex-wiki/crawler";
import { describe, expect, it } from "vitest";
import { createPipelineContext } from "../pipeline-context.js";
import { runSyncStep } from "./sync.step.js";

describe("runSyncStep", () => {
  it("runs the local mirror pipeline and writes validation and diff reports", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-sync-"));
    try {
      const httpClient: HttpFetchClient = async (url) => {
        if (url.endsWith("/codex/llms.txt")) {
          return {
            url,
            status: 200,
            headers: {},
            body: "- [CLI](https://developers.openai.com/codex/cli.md): CLI docs\n"
          };
        }

        return {
          url,
          status: 200,
          headers: {},
          body: "# Codex CLI\n\nCodex local search content.\n\n## Usage\n\nUse Codex safely with [OpenAI](https://openai.com).\n"
        };
      };

      const result = await runSyncStep(createPipelineContext({
        projectRoot,
        httpClient,
        delay: async () => undefined
      }));

      expect(result.validation.ok).toBe(true);
      expect(result.diff.pageCount).toBe(1);
      expect(result.diff.pages[0]).toMatchObject({
        id: "cli",
        status: "new"
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
