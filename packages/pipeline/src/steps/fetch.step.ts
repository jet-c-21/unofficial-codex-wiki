import { CrawlerTextFetcher } from "@unofficial-codex-wiki/crawler";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import { normalizeCodexPageUrl } from "@unofficial-codex-wiki/sources";
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

  emitProgress(context, {
    step: "fetch",
    phase: "start",
    message: `Fetching ${urls.length} Markdown page(s)`,
    total: urls.length,
    counts: {
      pages: urls.length
    },
    outputPaths: ["data/latest/raw-markdown/"]
  });

  for (const [index, url] of urls.entries()) {
    const localRawMarkdownPath = context.storage.getRawMarkdownRelativePath(url);
    const pageId = normalizeCodexPageUrl(url).id;
    let status: FetchPageRecord["status"] = "failed";

    try {
      const result = await fetcher.fetchText({
        url,
        cache: context.storage.createRawMarkdownCache(url)
      });
      await context.storage.copyLatestRawMarkdownToSnapshot(url, snapshotId);
      status = result.fromCache ? "cached" : "fetched";
      pages.push({
        url,
        localRawMarkdownPath,
        status
      });
    } catch (error) {
      pages.push({
        url,
        localRawMarkdownPath,
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
    outputPaths: ["data/latest/raw-markdown/", "data/latest/metadata/openai-codex.fetch.json"]
  });

  return report;
}
