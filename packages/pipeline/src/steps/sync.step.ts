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
  const discover = await runDiscoverStep(context);
  const fetch = await runFetchStep(context);
  const transform = await runTransformStep(context);
  const chunk = await runChunkStep(context);
  const index = await runIndexStep(context);
  const validation = (await runValidateStep(context)).report;

  if (!validation.ok) {
    throw new Error(`Validation failed with ${validation.errorCount} error(s). See data/latest/validation-report.json.`);
  }

  const diff = (await runDiffStep(context)).report;

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
