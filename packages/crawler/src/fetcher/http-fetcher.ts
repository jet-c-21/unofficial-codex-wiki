import type { CrawlerPolicy } from "@unofficial-codex-wiki/config";
import { request } from "undici";
import type { HttpFetchClient, HttpFetchResult, TextCacheAdapter, TextFetchResult } from "./fetch-result.js";
import { HostRateLimiter, type DelayFunction, type NowFunction } from "../rate-limit/host-rate-limiter.js";
import { getRetryDecision } from "../retry/retry-policy.js";
import { assertInCrawlerScope } from "../scope/url-scope.js";

export type CrawlerTextFetcherOptions = {
  policy: CrawlerPolicy;
  httpClient?: HttpFetchClient;
  delay?: DelayFunction;
  now?: NowFunction;
};

export type FetchTextOptions = {
  url: string;
  cache?: TextCacheAdapter;
};

export class CrawlerTextFetcher {
  private readonly policy: CrawlerPolicy;
  private readonly httpClient: HttpFetchClient;
  private readonly delay: DelayFunction;
  private readonly rateLimiter: HostRateLimiter;

  constructor(options: CrawlerTextFetcherOptions) {
    this.policy = options.policy;
    this.httpClient = options.httpClient ?? undiciFetchText;
    this.delay = options.delay ?? defaultDelay;
    const rateLimiterOptions: {
      delay: DelayFunction;
      now?: NowFunction;
      minDelayMs: number;
    } = {
      delay: this.delay,
      minDelayMs: this.policy.minDelayMsBetweenPageRequestsPerHost
    };

    if (options.now !== undefined) {
      rateLimiterOptions.now = options.now;
    }

    this.rateLimiter = new HostRateLimiter(rateLimiterOptions);
  }

  async fetchText(options: FetchTextOptions): Promise<TextFetchResult> {
    assertInCrawlerScope(options.url, this.policy);

    if (this.policy.cacheMode === "offline" || !this.policy.allowNetworkRequests) {
      return this.readRequiredCache(options);
    }

    if (this.policy.cacheMode === "prefer-cache" && options.cache !== undefined && await options.cache.exists()) {
      return {
        url: options.url,
        body: await options.cache.read(),
        status: 200,
        fromCache: true
      };
    }

    try {
      const result = await this.fetchFromNetwork(options.url);
      if (options.cache !== undefined) {
        await options.cache.write(result.body);
      }

      return {
        url: options.url,
        body: result.body,
        status: result.status,
        fromCache: false
      };
    } catch (error) {
      if (this.policy.cacheMode === "refresh" && options.cache !== undefined && await options.cache.exists()) {
        return {
          url: options.url,
          body: await options.cache.read(),
          status: 200,
          fromCache: true
        };
      }

      throw error;
    }
  }

  private async readRequiredCache(options: FetchTextOptions): Promise<TextFetchResult> {
    if (options.cache === undefined || !await options.cache.exists()) {
      throw new Error(`Offline cache miss for ${options.url}`);
    }

    return {
      url: options.url,
      body: await options.cache.read(),
      status: 200,
      fromCache: true
    };
  }

  private async fetchFromNetwork(url: string): Promise<HttpFetchResult> {
    let attemptIndex = 0;

    while (true) {
      await this.rateLimiter.waitForTurn(url);

      let result: HttpFetchResult;
      try {
        result = await this.httpClient(url, {
          headers: { "user-agent": this.policy.userAgent },
          timeoutMs: this.policy.requestTimeoutMs
        });
      } catch (error) {
        const decision = getRetryDecision({
          attemptIndex,
          error,
          policy: this.policy
        });

        if (!decision.shouldRetry) {
          throw error;
        }

        await this.delay(decision.delayMs);
        attemptIndex += 1;
        continue;
      }

      if (result.status >= 200 && result.status < 300) {
        return result;
      }

      const retryOptions: {
        attemptIndex: number;
        status: number;
        retryAfterHeader?: string;
        policy: CrawlerPolicy;
      } = {
        attemptIndex,
        status: result.status,
        policy: this.policy
      };

      const retryAfterHeader = result.headers["retry-after"];
      if (retryAfterHeader !== undefined) {
        retryOptions.retryAfterHeader = retryAfterHeader;
      }

      const decision = getRetryDecision(retryOptions);

      if (!decision.shouldRetry) {
        throw new Error(`Fetch failed for ${url} with HTTP ${result.status}`);
      }

      await this.delay(decision.delayMs);
      attemptIndex += 1;
    }
  }
}

async function undiciFetchText(url: string, options: {
  headers: Readonly<Record<string, string>>;
  timeoutMs: number;
}): Promise<HttpFetchResult> {
  const result = await request(url, {
    method: "GET",
    headers: options.headers,
    bodyTimeout: options.timeoutMs,
    headersTimeout: options.timeoutMs
  });

  const body = await result.body.text();
  const headers = normalizeHeaders(result.headers);

  return {
    url,
    status: result.statusCode,
    headers,
    body
  };
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const normalizedHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    normalizedHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
  }

  return normalizedHeaders;
}

async function defaultDelay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
