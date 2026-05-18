import { buildSearchIndex } from "@unofficial-codex-wiki/indexer";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import type { IndexReport } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";

export type IndexResult = {
  report: IndexReport;
};

export async function runIndexStep(context: PipelineContext): Promise<IndexResult> {
  if (!await context.storage.agentPageRecordsExist() || !await context.storage.agentChunkRecordsExist()) {
    throw new Error("Index input missing: generated/agent/docs.pages.jsonl or generated/agent/docs.chunks.jsonl is missing. Run docs:chunk first.");
  }

  const pages = await context.storage.readAgentPageRecords();
  const chunks = await context.storage.readAgentChunkRecords();
  const sqlitePath = context.storage.getSearchSqliteRelativePath();
  const result = buildSearchIndex({
    sqlitePath: context.storage.toAbsolutePath(sqlitePath),
    pages,
    chunks
  });

  const report: IndexReport = {
    indexedAt: nowIsoDateTime(),
    pageCount: result.pageCount,
    chunkCount: result.chunkCount,
    sqlitePath
  };
  await context.storage.writeIndexReport(report);

  return {
    report
  };
}
