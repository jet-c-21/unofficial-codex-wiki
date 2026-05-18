import type { PipelineContext, PipelineProgressEvent } from "./pipeline-context.js";

export function emitProgress(context: PipelineContext, event: PipelineProgressEvent): void {
  context.onProgress?.(event);
}

export function estimateRemainingMs(startedAtMs: number, completed: number, total: number, nowMs = Date.now()): number {
  if (completed <= 0 || total <= completed) {
    return 0;
  }

  const elapsedMs = nowMs - startedAtMs;
  const averageMs = elapsedMs / completed;
  return Math.max(0, Math.round((total - completed) * averageMs));
}
