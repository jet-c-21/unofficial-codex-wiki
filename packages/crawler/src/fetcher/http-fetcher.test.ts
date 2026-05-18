import { safeCrawlerPolicy, type CrawlerPolicy } from "@unofficial-codex-wiki/config";
import { describe, expect, it } from "vitest";
import { CrawlerTextFetcher } from "./http-fetcher.js";
import type { HttpFetchClient } from "./fetch-result.js";

function createCache(initialValue?: string) {
  let value = initialValue;

  return {
    exists: async () => value !== undefined,
    read: async () => {
      if (value === undefined) {
        throw new Error("missing cache");
      }
      return value;
    },
    write: async (content: string) => {
      value = content;
    }
  };
}

describe("CrawlerTextFetcher", () => {
  it("makes zero HTTP calls in offline mode", async () => {
    let calls = 0;
    const fetcher = new CrawlerTextFetcher({
      policy: { ...safeCrawlerPolicy, profile: "offline", cacheMode: "offline", allowNetworkRequests: false },
      httpClient: async () => {
        calls += 1;
        throw new Error("must not call network");
      },
      delay: async () => undefined
    });

    await expect(fetcher.fetchText({
      url: "https://developers.openai.com/codex/cli.md",
      cache: createCache("cached")
    })).resolves.toMatchObject({
      body: "cached",
      fromCache: true
    });
    expect(calls).toBe(0);
  });

  it("fails offline when the cache is missing", async () => {
    const fetcher = new CrawlerTextFetcher({
      policy: { ...safeCrawlerPolicy, profile: "offline", cacheMode: "offline", allowNetworkRequests: false },
      httpClient: async () => {
        throw new Error("must not call network");
      },
      delay: async () => undefined
    });

    await expect(fetcher.fetchText({
      url: "https://developers.openai.com/codex/cli.md",
      cache: createCache()
    })).rejects.toThrow(/Offline cache miss/u);
  });

  it("uses prefer-cache before the network", async () => {
    let calls = 0;
    const fetcher = new CrawlerTextFetcher({
      policy: safeCrawlerPolicy,
      httpClient: async () => {
        calls += 1;
        throw new Error("must not call network");
      },
      delay: async () => undefined
    });

    await expect(fetcher.fetchText({
      url: "https://developers.openai.com/codex/cli.md",
      cache: createCache("cached")
    })).resolves.toMatchObject({
      body: "cached",
      fromCache: true
    });
    expect(calls).toBe(0);
  });

  it("retries retryable statuses only", async () => {
    const statuses = [500, 200];
    const delays: number[] = [];
    const httpClient: HttpFetchClient = async (url) => {
      const status = statuses.shift() ?? 200;
      return { url, status, headers: {}, body: `status ${status}` };
    };
    const fetcher = new CrawlerTextFetcher({
      policy: { ...safeCrawlerPolicy, initialRetryDelayMs: 1 },
      httpClient,
      delay: async (ms) => {
        delays.push(ms);
      }
    });

    await expect(fetcher.fetchText({
      url: "https://developers.openai.com/codex/cli.md",
      cache: createCache()
    })).resolves.toMatchObject({
      body: "status 200",
      fromCache: false
    });
    expect(delays[0]).toBe(1);
    expect(delays[1]).toBeGreaterThanOrEqual(safeCrawlerPolicy.minDelayMsBetweenPageRequestsPerHost - 25);
    expect(delays[1]).toBeLessThanOrEqual(safeCrawlerPolicy.minDelayMsBetweenPageRequestsPerHost);
  });

  it("does not retry non-retryable statuses", async () => {
    let calls = 0;
    const fetcher = new CrawlerTextFetcher({
      policy: safeCrawlerPolicy,
      httpClient: async (url) => {
        calls += 1;
        return { url, status: 404, headers: {}, body: "missing" };
      },
      delay: async () => undefined
    });

    await expect(fetcher.fetchText({
      url: "https://developers.openai.com/codex/missing.md",
      cache: createCache()
    })).rejects.toThrow(/HTTP 404/u);
    expect(calls).toBe(1);
  });

  it("rejects out-of-scope URLs before fetching", async () => {
    const fetcher = new CrawlerTextFetcher({
      policy: safeCrawlerPolicy,
      httpClient: async () => {
        throw new Error("must not call network");
      },
      delay: async () => undefined
    });

    await expect(fetcher.fetchText({
      url: "https://platform.openai.com/docs",
      cache: createCache()
    })).rejects.toThrow(/Out-of-scope/u);
  });
});
