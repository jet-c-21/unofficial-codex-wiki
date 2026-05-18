import type { SnapshotDiffReport } from "@unofficial-codex-wiki/storage";
import type { ValidationReport } from "@unofficial-codex-wiki/validator";
import type { ChunkResult } from "./chunk.step.js";
import type { DiscoverResult } from "./discover.step.js";
import type { IndexResult } from "./index.step.js";
import type { TransformResult } from "./transform.step.js";
import { runChunkStep } from "./chunk.step.js";
import { runDiffStep } from "./diff.step.js";
import { runDiscoverStep } from "./discover.step.js";
import { runFetchStep } from "./fetch.step.js";
import { runIndexStep } from "./index.step.js";
import { runTransformStep } from "./transform.step.js";
import { runValidateStep } from "./validate.step.js";
import type { FetchReport } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";
import { emitProgress } from "../progress.js";

export type SyncResult = {
  discover: DiscoverResult;
  fetch: FetchReport;
  transform: TransformResult;
  chunk: ChunkResult;
  index: IndexResult;
  validation: ValidationReport;
  diff: SnapshotDiffReport;
};

export async function runSyncStep(context: PipelineContext): Promise<SyncResult> {
  const startedAtMs = Date.now();
  emitProgress(context, {
    step: "sync",
    phase: "start",
    message: "Starting local Codex docs sync"
  });

  const discover = await runDiscoverStep(context);
  const fetch = await runFetchStep(context);
  const transform = await runTransformStep(context);
  const chunk = await runChunkStep(context);
  const index = await runIndexStep(context);
  const validation = (await runValidateStep(context)).report;

  if (!validation.ok) {
    emitProgress(context, {
      step: "sync",
      phase: "failed",
      message: `Validation failed with ${validation.errorCount} error(s)`,
      elapsedMs: Date.now() - startedAtMs,
      counts: {
        errors: validation.errorCount,
        warnings: validation.warningCount
      },
      outputPaths: ["data/latest/validation-report.json"]
    });
    throw new Error(`Validation failed with ${validation.errorCount} error(s). See data/latest/validation-report.json.`);
  }

  const diff = (await runDiffStep(context)).report;

  emitProgress(context, {
    step: "sync",
    phase: "complete",
    message: "Local Codex docs sync completed",
    elapsedMs: Date.now() - startedAtMs,
    counts: {
      pages: transform.report.generatedPageCount,
      chunks: chunk.report.chunkCount,
      indexed: index.report.chunkCount,
      diffPages: diff.pageCount
    },
    outputPaths: [
      "data/latest/manifest.json",
      "generated/markdown/codex/",
      "generated/agent/docs.pages.jsonl",
      "generated/agent/docs.chunks.jsonl",
      "generated/search/docs.sqlite",
      "data/latest/validation-report.json",
      "data/latest/diff.json"
    ]
  });

  return {
    discover,
    fetch,
    transform,
    chunk,
    index,
    validation,
    diff
  };
}
