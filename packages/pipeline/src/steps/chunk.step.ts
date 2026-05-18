import { createAgentDocPageRecord, chunkMarkdownPage, splitFrontMatter, toAgentDocChunkRecord } from "@unofficial-codex-wiki/chunker";
import { nowIsoDateTime, type AgentDocChunkRecord, type AgentDocPageRecord } from "@unofficial-codex-wiki/core";
import type { AgentDocsManifest, ChunkReport } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";
import { emitProgress } from "../progress.js";

export type ChunkResult = {
  agentManifest: AgentDocsManifest;
  report: ChunkReport;
};

export async function runChunkStep(context: PipelineContext): Promise<ChunkResult> {
  if (!await context.storage.latestManifestExists()) {
    throw new Error("Chunk input missing: data/latest/manifest.json is missing. Run docs:transform first.");
  }

  const manifest = await context.storage.readLatestManifest();
  const eligiblePages = manifest.pages.filter((page) => page.status !== "failed" && page.status !== "removed");
  const limitedPages = context.limit === undefined ? eligiblePages : eligiblePages.slice(0, context.limit);
  const pageRecords: AgentDocPageRecord[] = [];
  const chunkRecords: AgentDocChunkRecord[] = [];
  const chunkIdsByPageId = new Map<string, string[]>();

  emitProgress(context, {
    step: "chunk",
    phase: "start",
    message: `Chunking ${limitedPages.length} generated Markdown page(s)`,
    total: limitedPages.length,
    counts: {
      pages: limitedPages.length
    },
    outputPaths: ["generated/agent/docs.pages.jsonl", "generated/agent/docs.chunks.jsonl"]
  });

  for (const page of limitedPages) {
    const generatedMarkdown = await context.storage.readGeneratedMarkdown(page.localMarkdownPath);
    const markdownBody = splitFrontMatter(generatedMarkdown).body;
    const pageChunks = chunkMarkdownPage(page, markdownBody);

    pageRecords.push(createAgentDocPageRecord(page, markdownBody));
    chunkRecords.push(...pageChunks.map(toAgentDocChunkRecord));
    chunkIdsByPageId.set(page.id, pageChunks.map((chunk) => chunk.id));
  }

  const updatedManifest = {
    ...manifest,
    pages: manifest.pages.map((page) => ({
      ...page,
      localJsonlChunkIds: chunkIdsByPageId.get(page.id) ?? page.localJsonlChunkIds
    }))
  };
  await context.storage.writeManifest(updatedManifest);
  await context.storage.writeAgentPageRecords(pageRecords);
  await context.storage.writeAgentChunkRecords(chunkRecords);

  const agentManifest: AgentDocsManifest = {
    generatedAt: nowIsoDateTime(),
    pageCount: pageRecords.length,
    chunkCount: chunkRecords.length,
    pages: pageRecords.map((page) => ({
      id: page.id,
      title: page.title,
      sourceUrl: page.sourceUrl,
      canonicalUrl: page.canonicalUrl,
      localMarkdownPath: page.localMarkdownPath,
      localJsonlChunkIds: chunkIdsByPageId.get(page.id) ?? []
    }))
  };
  await context.storage.writeAgentDocsManifest(agentManifest);

  const report: ChunkReport = {
    chunkedAt: agentManifest.generatedAt,
    pageCount: pageRecords.length,
    chunkCount: chunkRecords.length,
    pagesJsonlPath: "generated/agent/docs.pages.jsonl",
    chunksJsonlPath: "generated/agent/docs.chunks.jsonl",
    manifestPath: "generated/agent/docs.manifest.json"
  };
  await context.storage.writeChunkReport(report);

  emitProgress(context, {
    step: "chunk",
    phase: "complete",
    message: `Chunked ${report.pageCount} page(s) into ${report.chunkCount} chunk(s)`,
    counts: {
      pages: report.pageCount,
      chunks: report.chunkCount
    },
    outputPaths: [report.pagesJsonlPath, report.chunksJsonlPath, report.manifestPath]
  });

  return {
    agentManifest,
    report
  };
}
