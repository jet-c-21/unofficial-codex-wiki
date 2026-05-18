import { CrawlerTextFetcher } from "@unofficial-codex-wiki/crawler";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import { createSnapshotId, type FetchPageRecord, type FetchReport } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";

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

  for (const url of urls) {
    const localRawMarkdownPath = context.storage.getRawMarkdownRelativePath(url);

    try {
      const result = await fetcher.fetchText({
        url,
        cache: context.storage.createRawMarkdownCache(url)
      });
      await context.storage.copyLatestRawMarkdownToSnapshot(url, snapshotId);
      pages.push({
        url,
        localRawMarkdownPath,
        status: result.fromCache ? "cached" : "fetched"
      });
    } catch (error) {
      pages.push({
        url,
        localRawMarkdownPath,
        status: "failed",
        failureReason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const report: FetchReport = {
    fetchedAt: nowIsoDateTime(),
    pageCount: pages.length,
    pages
  };
  await context.storage.writeFetchReport(report, snapshotId);

  const failedPages = pages.filter((page) => page.status === "failed");
  if (failedPages.length > 0) {
    throw new Error(`Fetch failed for ${failedPages.length} page(s). See data/latest/metadata/openai-codex.fetch.json.`);
  }

  return report;
}
