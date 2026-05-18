import { buildSearchIndex } from "@unofficial-codex-wiki/indexer";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import type { IndexReport } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";
import { emitProgress } from "../progress.js";

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
  emitProgress(context, {
    step: "index",
    phase: "start",
    message: `Indexing ${pages.length} page(s) and ${chunks.length} chunk(s)`,
    counts: {
      pages: pages.length,
      chunks: chunks.length
    },
    outputPaths: [sqlitePath]
  });

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

  emitProgress(context, {
    step: "index",
    phase: "complete",
    message: `Indexed ${report.pageCount} page(s) and ${report.chunkCount} chunk(s)`,
    counts: {
      pages: report.pageCount,
      chunks: report.chunkCount
    },
    outputPaths: [report.sqlitePath]
  });

  return {
    report
  };
}
