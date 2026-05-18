import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";
import { CrawlerTextFetcher } from "@unofficial-codex-wiki/crawler";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import { createCodexDiscoveryOutput, type CodexDiscoveryOutput } from "@unofficial-codex-wiki/sources";
import type { PipelineContext } from "../pipeline-context.js";
import { emitProgress } from "../progress.js";

export type DiscoverResult = {
  discovery: CodexDiscoveryOutput;
  fromCache: boolean;
};

export async function runDiscoverStep(context: PipelineContext): Promise<DiscoverResult> {
  emitProgress(context, {
    step: "discover",
    phase: "start",
    message: "Discovering Codex documentation URLs"
  });

  if (context.policy.cacheMode === "offline" || !context.policy.allowNetworkRequests) {
    if (!await context.storage.discoveryOutputExists()) {
      throw new Error("Offline discovery cache miss: data/latest/discovery/openai-codex.urls.json is missing.");
    }

    const discovery = await context.storage.readLatestDiscoveryOutput();
    emitProgress(context, {
      step: "discover",
      phase: "complete",
      message: `Discovered ${discovery.pageCount} page(s) from cache`,
      counts: {
        pages: discovery.pageCount
      },
      outputPaths: ["data/latest/discovery/openai-codex.urls.json"]
    });

    return {
      discovery,
      fromCache: true
    };
  }

  if (context.policy.cacheMode === "prefer-cache" && await context.storage.discoveryOutputExists()) {
    const discovery = await context.storage.readLatestDiscoveryOutput();
    emitProgress(context, {
      step: "discover",
      phase: "complete",
      message: `Discovered ${discovery.pageCount} page(s) from cache`,
      counts: {
        pages: discovery.pageCount
      },
      outputPaths: ["data/latest/discovery/openai-codex.urls.json"]
    });

    return {
      discovery,
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
    emitProgress(context, {
      step: "discover",
      phase: "complete",
      message: `Discovered ${discovery.pageCount} page(s)${fetchResult.fromCache ? " from cache" : " from network"}`,
      counts: {
        pages: discovery.pageCount
      },
      outputPaths: ["data/latest/discovery/openai-codex.urls.json"]
    });

    return {
      discovery,
      fromCache: fetchResult.fromCache
    };
  } catch (error) {
    if (context.policy.cacheMode === "refresh" && await context.storage.discoveryOutputExists()) {
      const discovery = await context.storage.readLatestDiscoveryOutput();
      emitProgress(context, {
        step: "discover",
        phase: "complete",
        message: `Discovery refresh failed; reused ${discovery.pageCount} cached page(s)`,
        counts: {
          pages: discovery.pageCount
        },
        outputPaths: ["data/latest/discovery/openai-codex.urls.json"]
      });

      return {
        discovery,
        fromCache: true
      };
    }

    emitProgress(context, {
      step: "discover",
      phase: "failed",
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
