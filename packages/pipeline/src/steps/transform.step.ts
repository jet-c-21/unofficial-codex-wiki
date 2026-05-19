import { type ManifestPage, nowIsoDateTime, sha256 } from "@unofficial-codex-wiki/core";
import { isCodexUseCasesPageUrl, normalizeCodexPageUrl } from "@unofficial-codex-wiki/sources";
import { createSnapshotId, type DocsManifest, type FetchPageRecord, type TransformPageRecord, type TransformReport } from "@unofficial-codex-wiki/storage";
import { buildManifestPathMap, htmlToMarkdown, resolveManifestPathEntry, transformMarkdownPage } from "@unofficial-codex-wiki/transformer";
import type { PipelineContext } from "../pipeline-context.js";
import { emitProgress } from "../progress.js";

export type TransformResult = {
  manifest: DocsManifest;
  report: TransformReport;
};

export async function runTransformStep(context: PipelineContext): Promise<TransformResult> {
  const discovery = await context.storage.readLatestDiscoveryOutput();
  if (!await context.storage.fetchReportExists()) {
    throw new Error("Transform input missing: data/latest/metadata/openai-codex.fetch.json is missing. Run docs:fetch first.");
  }

  const fetchReport = await context.storage.readLatestFetchReport();
  const transformedAt = nowIsoDateTime();
  const snapshotId = createSnapshotId();
  const urls = context.limit === undefined ? discovery.urls : discovery.urls.slice(0, context.limit);
  const manifestPathMap = buildManifestPathMap(urls);
  const fetchRecords = new Map(fetchReport.pages.map((page) => [normalizeCodexPageUrl(page.url).markdownSourceUrl, page]));
  const discoveryPages = new Map((discovery.pages ?? []).map((page) => [page.canonicalUrl, page]));
  const manifestPages: ManifestPage[] = [];
  const reportPages: TransformPageRecord[] = [];

  emitProgress(context, {
    step: "transform",
    phase: "start",
    message: `Transforming ${urls.length} raw source page(s)`,
    total: urls.length,
    counts: {
      pages: urls.length
    },
    outputPaths: ["generated/markdown/codex/", "data/latest/manifest.json"]
  });

  for (const sourceUrl of urls) {
    const normalized = normalizeCodexPageUrl(sourceUrl);
    const fetchRecord = fetchRecords.get(normalized.markdownSourceUrl);
    const sourceType = fetchRecord?.sourceType ?? getExpectedSourceType(sourceUrl);
    const localRawMarkdownPath = fetchRecord?.localRawMarkdownPath ?? (sourceType === "markdown" ? context.storage.getRawMarkdownRelativePath(sourceUrl) : undefined);
    const localRawHtmlPath = fetchRecord?.localRawHtmlPath ?? (sourceType === "html" ? context.storage.getRawHtmlRelativePath(sourceUrl) : undefined);
    const pathEntry = resolveManifestPathEntry(manifestPathMap, sourceUrl);
    const discoveryPage = discoveryPages.get(normalized.canonicalUrl);

    if (pathEntry === undefined) {
      throw new Error(`Internal transform error: missing generated path for ${sourceUrl}`);
    }

    const fetchFailureReason = getFetchFailureReason(fetchRecord);
    if (fetchFailureReason !== undefined) {
      const failedPage = createFailedManifestPage({
        sourceUrl,
        ...(localRawMarkdownPath === undefined ? {} : { localRawMarkdownPath }),
        ...(localRawHtmlPath === undefined ? {} : { localRawHtmlPath }),
        localMarkdownPath: pathEntry.localMarkdownPath,
        fetchedAt: fetchReport.fetchedAt,
        ...(discoveryPage?.description === undefined ? {} : { description: discoveryPage.description }),
        failureReason: fetchFailureReason
      });
      manifestPages.push(failedPage);
      reportPages.push(toFailedTransformPage(failedPage, fetchFailureReason));
      continue;
    }

    const rawSourceExists = sourceType === "html"
      ? await context.storage.rawHtmlExists(sourceUrl)
      : await context.storage.rawMarkdownExists(sourceUrl);
    if (!rawSourceExists) {
      const expectedPath = sourceType === "html" ? localRawHtmlPath : localRawMarkdownPath;
      const failureReason = `Raw ${sourceType === "html" ? "HTML" : "Markdown"} cache is missing at ${expectedPath ?? "unknown path"}`;
      const failedPage = createFailedManifestPage({
        sourceUrl,
        ...(localRawMarkdownPath === undefined ? {} : { localRawMarkdownPath }),
        ...(localRawHtmlPath === undefined ? {} : { localRawHtmlPath }),
        localMarkdownPath: pathEntry.localMarkdownPath,
        fetchedAt: fetchReport.fetchedAt,
        ...(discoveryPage?.description === undefined ? {} : { description: discoveryPage.description }),
        failureReason
      });
      manifestPages.push(failedPage);
      reportPages.push(toFailedTransformPage(failedPage, failureReason));
      continue;
    }

    const rawMarkdown = sourceType === "html"
      ? htmlToMarkdown({
        sourceUrl: normalized.canonicalUrl,
        html: await context.storage.readLatestRawHtml(sourceUrl)
      })
      : await context.storage.readLatestRawMarkdown(sourceUrl);
    const transformedPage = transformMarkdownPage({
      sourceUrl,
      rawMarkdown,
      fetchedAt: fetchReport.fetchedAt,
      manifestPathMap,
      ...(discoveryPage?.description === undefined ? {} : { description: discoveryPage.description }),
      ...(localRawMarkdownPath === undefined ? {} : { localRawMarkdownPath }),
      ...(localRawHtmlPath === undefined ? {} : { localRawHtmlPath })
    });

    await context.storage.writeGeneratedMarkdown(transformedPage.page.localMarkdownPath, transformedPage.markdown);
    manifestPages.push(transformedPage.manifestPage);
    reportPages.push({
      id: transformedPage.page.id,
      sourceUrl: transformedPage.page.sourceUrl,
      localMarkdownPath: transformedPage.page.localMarkdownPath,
      status: "generated"
    });
  }

  const manifest: DocsManifest = {
    generatedAt: transformedAt,
    source: discovery.source,
    pageCount: manifestPages.length,
    pages: manifestPages
  };
  const failedPageCount = reportPages.filter((page) => page.status === "failed").length;
  const report: TransformReport = {
    transformedAt,
    pageCount: reportPages.length,
    generatedPageCount: reportPages.length - failedPageCount,
    failedPageCount,
    pages: reportPages
  };

  await context.storage.writeManifest(manifest, snapshotId);
  await context.storage.writeTransformReport(report, snapshotId);

  if (failedPageCount > 0) {
    emitProgress(context, {
      step: "transform",
      phase: "failed",
      message: `Transform failed for ${failedPageCount} page(s)`,
      counts: {
        generated: report.generatedPageCount,
        failed: failedPageCount
      },
      outputPaths: ["data/latest/manifest.json", "data/latest/metadata/openai-codex.transform.json"]
    });
    throw new Error(`Transform failed for ${failedPageCount} page(s). See data/latest/manifest.json.`);
  }

  emitProgress(context, {
    step: "transform",
    phase: "complete",
    message: `Generated ${report.generatedPageCount} Markdown page(s)`,
    counts: {
      generated: report.generatedPageCount,
      failed: failedPageCount
    },
    outputPaths: ["generated/markdown/codex/", "data/latest/manifest.json", "data/latest/metadata/openai-codex.transform.json"]
  });

  return {
    manifest,
    report
  };
}

function getFetchFailureReason(fetchRecord: FetchPageRecord | undefined): string | undefined {
  if (fetchRecord === undefined) {
    return "Fetch report does not include this discovered page.";
  }

  if (fetchRecord.status !== "failed") {
    return undefined;
  }

  return fetchRecord.failureReason ?? "Fetch failed without a recorded reason.";
}

function createFailedManifestPage(input: {
  sourceUrl: string;
  localRawMarkdownPath?: string;
  localRawHtmlPath?: string;
  localMarkdownPath: string;
  fetchedAt: string;
  description?: string;
  failureReason: string;
}): ManifestPage {
  const normalized = normalizeCodexPageUrl(input.sourceUrl);
  const page: ManifestPage = {
    id: normalized.id,
    title: normalized.id,
    ...(input.description === undefined ? {} : { description: input.description }),
    sourceUrl: normalized.canonicalUrl,
    canonicalUrl: normalized.canonicalUrl,
    markdownSourceUrl: normalized.markdownSourceUrl,
    localMarkdownPath: input.localMarkdownPath,
    localJsonlChunkIds: [],
    contentHash: sha256(""),
    fetchedAt: input.fetchedAt,
    status: "failed",
    failureReason: input.failureReason
  };

  if (input.localRawMarkdownPath !== undefined) {
    page.localRawMarkdownPath = input.localRawMarkdownPath;
  }

  if (input.localRawHtmlPath !== undefined) {
    page.localRawHtmlPath = input.localRawHtmlPath;
  }

  if (normalized.section !== undefined) {
    page.section = normalized.section;
  }

  return page;
}

function toFailedTransformPage(page: ManifestPage, failureReason: string): TransformPageRecord {
  return {
    id: page.id,
    sourceUrl: page.sourceUrl,
    localMarkdownPath: page.localMarkdownPath,
    status: "failed",
    failureReason
  };
}

function getExpectedSourceType(sourceUrl: string): FetchPageRecord["sourceType"] {
  return isCodexUseCasesPageUrl(sourceUrl) ? "html" : "markdown";
}
