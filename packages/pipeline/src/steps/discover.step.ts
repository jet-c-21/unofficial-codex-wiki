import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";
import { CrawlerTextFetcher } from "@unofficial-codex-wiki/crawler";
import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import {
  createCodexDiscoveryOutput,
  extractCodexCoverageReferenceUrls,
  type CodexDiscoveryPage,
  normalizeCodexPageUrl,
  parseCodexUseCasesHtml,
  type CodexDiscoveryOutput
} from "@unofficial-codex-wiki/sources";
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
    if (discoveryIncludesUseCases(discovery) && discoveryIncludesPageMetadata(discovery)) {
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
    const useCasesFetchResult = await fetcher.fetchText({
      url: openAiCodexSourceConfig.useCasesUrl,
      cache: context.storage.createUseCasesDiscoveryDocumentCache()
    });
    const coverageReference = await fetchCoverageReference(context, fetcher);
    const discoveryInput: {
      llmsText: string;
      useCasesHtml: string;
      discoveredAt: string;
      coverageReference?: CodexDiscoveryOutput["coverageReference"];
    } = {
      llmsText: fetchResult.body,
      useCasesHtml: useCasesFetchResult.body,
      discoveredAt: nowIsoDateTime()
    };
    if (coverageReference !== undefined) {
      discoveryInput.coverageReference = coverageReference;
    }
    const discovery = createAugmentedCodexDiscoveryOutput(discoveryInput);
    await context.storage.writeDiscoveryOutput(discovery);
    emitProgress(context, {
      step: "discover",
      phase: "complete",
      message: `Discovered ${discovery.pageCount} page(s)${fetchResult.fromCache && useCasesFetchResult.fromCache ? " from cache" : " from network/cache"}`,
      counts: {
        pages: discovery.pageCount
      },
      outputPaths: ["data/latest/discovery/openai-codex.urls.json"]
    });

    return {
      discovery,
      fromCache: fetchResult.fromCache && useCasesFetchResult.fromCache
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

function createAugmentedCodexDiscoveryOutput(input: {
  llmsText: string;
  useCasesHtml: string;
  discoveredAt: string;
  coverageReference?: CodexDiscoveryOutput["coverageReference"];
}): CodexDiscoveryOutput {
  const discovery = createCodexDiscoveryOutput(input.llmsText, input.discoveredAt);
  const seenCanonicalUrls = new Set<string>();
  const urls: string[] = [];
  const pagesByCanonicalUrl = new Map<string, CodexDiscoveryPage>();

  for (const page of discovery.pages ?? []) {
    pagesByCanonicalUrl.set(page.canonicalUrl, page);
  }

  for (const url of discovery.urls) {
    const normalized = normalizeCodexPageUrl(url);
    if (seenCanonicalUrls.has(normalized.canonicalUrl)) {
      continue;
    }

    seenCanonicalUrls.add(normalized.canonicalUrl);
    urls.push(normalized.markdownSourceUrl);
  }

  for (const link of parseCodexUseCasesHtml(input.useCasesHtml)) {
    if (seenCanonicalUrls.has(link.canonicalUrl)) {
      continue;
    }

    seenCanonicalUrls.add(link.canonicalUrl);
    urls.push(link.canonicalUrl);
    pagesByCanonicalUrl.set(link.canonicalUrl, {
      id: link.id,
      title: link.id,
      sourceUrl: link.canonicalUrl,
      canonicalUrl: link.canonicalUrl,
      markdownSourceUrl: link.markdownSourceUrl
    });
  }

  const output: CodexDiscoveryOutput = {
    ...discovery,
    pageCount: urls.length,
    urls,
    pages: urls.map((url) => {
      const normalized = normalizeCodexPageUrl(url);
      return pagesByCanonicalUrl.get(normalized.canonicalUrl) ?? {
        id: normalized.id,
        title: normalized.id,
        sourceUrl: normalized.canonicalUrl,
        canonicalUrl: normalized.canonicalUrl,
        markdownSourceUrl: normalized.markdownSourceUrl
      };
    })
  };

  if (input.coverageReference !== undefined) {
    output.coverageReference = input.coverageReference;
  }

  return output;
}

async function fetchCoverageReference(
  context: PipelineContext,
  fetcher: CrawlerTextFetcher
): Promise<CodexDiscoveryOutput["coverageReference"] | undefined> {
  try {
    const result = await fetcher.fetchText({
      url: openAiCodexSourceConfig.optionalCoverageUrl,
      cache: context.storage.createCoverageReferenceDocumentCache()
    });
    const urls = extractCodexCoverageReferenceUrls(result.body);
    return {
      source: openAiCodexSourceConfig.optionalCoverageUrl,
      checkedAt: nowIsoDateTime(),
      pageCount: urls.length,
      urls
    };
  } catch {
    return undefined;
  }
}

function discoveryIncludesUseCases(discovery: CodexDiscoveryOutput): boolean {
  return discovery.urls.some((url) => {
    try {
      return normalizeCodexPageUrl(url).canonicalUrl === openAiCodexSourceConfig.useCasesUrl;
    } catch {
      return false;
    }
  });
}

function discoveryIncludesPageMetadata(discovery: CodexDiscoveryOutput): boolean {
  return discovery.pages !== undefined
    && discovery.pages.length >= discovery.urls.length
    && discovery.pages.some((page) => page.description !== undefined);
}
