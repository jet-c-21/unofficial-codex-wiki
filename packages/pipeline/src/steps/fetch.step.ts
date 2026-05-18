import { CrawlerTextFetcher } from "@unofficial-codex-wiki/crawler";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import { isCodexUseCasesPageUrl, normalizeCodexPageUrl } from "@unofficial-codex-wiki/sources";
import { createSnapshotId, type FetchPageRecord, type FetchReport } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";
import { emitProgress, estimateRemainingMs } from "../progress.js";

export async function runFetchStep(context: PipelineContext): Promise<FetchReport> {
  const discovery = await context.storage.readLatestDiscoveryOutput();
  const snapshotId = createSnapshotId();
  const urls = context.limit === undefined ? discovery.urls : discovery.urls.slice(0, context.limit);
  const fetcherOptions: ConstructorParameters<typeof CrawlerTextFetcher>[0] = {
    policy: context.policy
  };
  if (context.httpClient !== undefined) {
    fetcherOptions.httpClient = context.httpClient;
  }
  if (context.delay !== undefined) {
    fetcherOptions.delay = context.delay;
  }
  const fetcher = new CrawlerTextFetcher(fetcherOptions);
  const pages: FetchPageRecord[] = [];
  const startedAtMs = Date.now();
  const outputPaths = urls.some((url) => getFetchSourceType(url) === "html")
    ? ["data/latest/raw-markdown/", "data/latest/raw-html/"]
    : ["data/latest/raw-markdown/"];

  emitProgress(context, {
    step: "fetch",
    phase: "start",
    message: `Fetching ${urls.length} source page(s)`,
    total: urls.length,
    counts: {
      pages: urls.length
    },
    outputPaths
  });

  for (const [index, url] of urls.entries()) {
    const sourceType = getFetchSourceType(url);
    const normalized = normalizeCodexPageUrl(url);
    const fetchUrl = sourceType === "html" ? normalized.canonicalUrl : normalized.markdownSourceUrl;
    const localRawMarkdownPath = sourceType === "markdown" ? context.storage.getRawMarkdownRelativePath(fetchUrl) : undefined;
    const localRawHtmlPath = sourceType === "html" ? context.storage.getRawHtmlRelativePath(fetchUrl) : undefined;
    const pageId = normalized.id;
    let status: FetchPageRecord["status"] = "failed";

    try {
      const result = await fetcher.fetchText({
        url: fetchUrl,
        cache: sourceType === "html"
          ? context.storage.createRawHtmlCache(fetchUrl)
          : context.storage.createRawMarkdownCache(fetchUrl)
      });
      if (sourceType === "html") {
        await context.storage.copyLatestRawHtmlToSnapshot(fetchUrl, snapshotId);
      } else {
        await context.storage.copyLatestRawMarkdownToSnapshot(fetchUrl, snapshotId);
      }
      status = result.fromCache ? "cached" : "fetched";
      pages.push({
        url: fetchUrl,
        sourceType,
        ...(localRawMarkdownPath === undefined ? {} : { localRawMarkdownPath }),
        ...(localRawHtmlPath === undefined ? {} : { localRawHtmlPath }),
        status
      });
    } catch (error) {
      pages.push({
        url: fetchUrl,
        sourceType,
        ...(localRawMarkdownPath === undefined ? {} : { localRawMarkdownPath }),
        ...(localRawHtmlPath === undefined ? {} : { localRawHtmlPath }),
        status: "failed",
        failureReason: error instanceof Error ? error.message : String(error)
      });
    }

    const completed = index + 1;
    const nowMs = Date.now();
    emitProgress(context, {
      step: "fetch",
      phase: "progress",
      message: `Fetched ${completed}/${urls.length}: ${pageId} (${status})`,
      current: completed,
      total: urls.length,
      item: pageId,
      status,
      elapsedMs: nowMs - startedAtMs,
      estimatedRemainingMs: estimateRemainingMs(startedAtMs, completed, urls.length, nowMs)
    });
  }

  const report: FetchReport = {
    fetchedAt: nowIsoDateTime(),
    pageCount: pages.length,
    pages
  };
  await context.storage.writeFetchReport(report, snapshotId);

  const failedPages = pages.filter((page) => page.status === "failed");
  const fetchedCount = pages.filter((page) => page.status === "fetched").length;
  const cachedCount = pages.filter((page) => page.status === "cached").length;
  if (failedPages.length > 0) {
    emitProgress(context, {
      step: "fetch",
      phase: "failed",
      message: `Fetch failed for ${failedPages.length} page(s)`,
      counts: {
        fetched: fetchedCount,
        cached: cachedCount,
        failed: failedPages.length
      },
    outputPaths: ["data/latest/metadata/openai-codex.fetch.json"]
    });
    throw new Error(`Fetch failed for ${failedPages.length} page(s). See data/latest/metadata/openai-codex.fetch.json.`);
  }

  emitProgress(context, {
    step: "fetch",
    phase: "complete",
    message: `Fetched ${fetchedCount} page(s); reused ${cachedCount} cached page(s)`,
    counts: {
      fetched: fetchedCount,
      cached: cachedCount,
      failed: 0
    },
    outputPaths: [...outputPaths, "data/latest/metadata/openai-codex.fetch.json"]
  });

  return report;
}

function getFetchSourceType(url: string): FetchPageRecord["sourceType"] {
  return isCodexUseCasesPageUrl(url) ? "html" : "markdown";
}
