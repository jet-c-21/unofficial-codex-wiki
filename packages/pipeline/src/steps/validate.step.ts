import { safeCrawlerPolicy } from "@unofficial-codex-wiki/config";
import { searchIndex } from "@unofficial-codex-wiki/indexer";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import { validateMirror, type GeneratedMarkdownPage, type ValidationReport } from "@unofficial-codex-wiki/validator";
import type { AgentDocsManifest } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";

export type ValidateResult = {
  report: ValidationReport;
};

export async function runValidateStep(context: PipelineContext): Promise<ValidateResult> {
  const discovery = await context.storage.discoveryOutputExists()
    ? await context.storage.readLatestDiscoveryOutput()
    : null;
  const manifest = await context.storage.latestManifestExists()
    ? await context.storage.readLatestManifest()
    : null;
  const pageRecords = await context.storage.agentPageRecordsExist()
    ? await context.storage.readAgentPageRecords()
    : [];
  const chunkRecords = await context.storage.agentChunkRecordsExist()
    ? await context.storage.readAgentChunkRecords()
    : [];
  const agentManifest = await readAgentManifestIfPresent(context);
  const generatedMarkdownPages = await readGeneratedMarkdownPages(context);
  const searchSqliteExists = await context.storage.searchSqliteExists();
  const knownSearchResultCount = searchSqliteExists ? getKnownSearchResultCount(context) : 0;

  const report = validateMirror({
    validatedAt: nowIsoDateTime(),
    discovery,
    manifest,
    generatedMarkdownPages,
    pageRecords,
    chunkRecords,
    agentManifest,
    searchSqliteExists,
    knownSearchResultCount,
    defaultCrawlerPolicy: safeCrawlerPolicy
  });

  await context.storage.writeValidationReport(report);
  return { report };
}

async function readAgentManifestIfPresent(context: PipelineContext): Promise<AgentDocsManifest | null> {
  return await context.storage.agentDocsManifestExists()
    ? await context.storage.readAgentDocsManifest()
    : null;
}

async function readGeneratedMarkdownPages(context: PipelineContext): Promise<GeneratedMarkdownPage[]> {
  if (!await context.storage.latestManifestExists()) {
    return [];
  }

  const manifest = await context.storage.readLatestManifest();
  const pages: GeneratedMarkdownPage[] = [];

  for (const page of manifest.pages) {
    if (page.status === "failed" || page.status === "removed") {
      continue;
    }

    pages.push({
      localMarkdownPath: page.localMarkdownPath,
      content: await context.storage.generatedMarkdownExists(page.localMarkdownPath)
        ? await context.storage.readGeneratedMarkdown(page.localMarkdownPath)
        : null
    });
  }

  return pages;
}

function getKnownSearchResultCount(context: PipelineContext): number {
  try {
    return searchIndex(
      context.storage.toAbsolutePath(context.storage.getSearchSqliteRelativePath()),
      "codex",
      { limit: 1 }
    ).length;
  } catch {
    return 0;
  }
}
