import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";
import { CrawlerTextFetcher } from "@unofficial-codex-wiki/crawler";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import { createCodexDiscoveryOutput, type CodexDiscoveryOutput } from "@unofficial-codex-wiki/sources";
import type { PipelineContext } from "../pipeline-context.js";

export type DiscoverResult = {
  discovery: CodexDiscoveryOutput;
  fromCache: boolean;
};

export async function runDiscoverStep(context: PipelineContext): Promise<DiscoverResult> {
  if (context.policy.cacheMode === "offline" || !context.policy.allowNetworkRequests) {
    if (!await context.storage.discoveryOutputExists()) {
      throw new Error("Offline discovery cache miss: data/latest/discovery/openai-codex.urls.json is missing.");
    }

    return {
      discovery: await context.storage.readLatestDiscoveryOutput(),
      fromCache: true
    };
  }

  if (context.policy.cacheMode === "prefer-cache" && await context.storage.discoveryOutputExists()) {
    return {
      discovery: await context.storage.readLatestDiscoveryOutput(),
      fromCache: true
    };
  }

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

  try {
    const fetchResult = await fetcher.fetchText({
      url: openAiCodexSourceConfig.discoveryUrl,
      cache: context.storage.createDiscoveryDocumentCache()
    });
    const discovery = createCodexDiscoveryOutput(fetchResult.body, nowIsoDateTime());
    await context.storage.writeDiscoveryOutput(discovery);

    return {
      discovery,
      fromCache: fetchResult.fromCache
    };
  } catch (error) {
    if (context.policy.cacheMode === "refresh" && await context.storage.discoveryOutputExists()) {
      return {
        discovery: await context.storage.readLatestDiscoveryOutput(),
        fromCache: true
      };
    }

    throw error;
  }
}
