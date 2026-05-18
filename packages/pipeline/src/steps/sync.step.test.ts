import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { HttpFetchClient } from "@unofficial-codex-wiki/crawler";
import { describe, expect, it } from "vitest";
import { createPipelineContext, type PipelineProgressEvent } from "../pipeline-context.js";
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

        if (url.endsWith("/codex/use-cases")) {
          return {
            url,
            status: 200,
            headers: {},
            body: "<main><h1>Codex Use Cases</h1><p>Example workflows and tasks teams hand to Codex.</p></main>"
          };
        }

        return {
          url,
          status: 200,
          headers: {},
          body: "# Codex CLI\n\nCodex local search content.\n\n## Usage\n\nUse Codex safely with [OpenAI](https://openai.com).\n"
        };
      };
      const progressEvents: PipelineProgressEvent[] = [];

      const result = await runSyncStep(createPipelineContext({
        projectRoot,
        httpClient,
        delay: async () => undefined,
        onProgress: (event) => {
          progressEvents.push(event);
        }
      }));

      expect(result.validation.ok).toBe(true);
      expect(result.diff.pageCount).toBe(2);
      expect(result.diff.pages[0]).toMatchObject({
        id: "cli",
        status: "new"
      });
      expect(progressEvents.map((event) => `${event.step}:${event.phase}`)).toEqual(expect.arrayContaining([
        "sync:start",
        "discover:start",
        "discover:complete",
        "fetch:start",
        "fetch:progress",
        "fetch:complete",
        "transform:complete",
        "chunk:complete",
        "index:complete",
        "validate:complete",
        "diff:complete",
        "sync:complete"
      ]));
      expect(progressEvents.find((event) => event.step === "fetch" && event.phase === "progress")).toMatchObject({
        current: 1,
        total: 2,
        item: "cli",
        status: "fetched"
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
