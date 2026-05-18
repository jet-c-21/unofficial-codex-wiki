import { describe, expect, it } from "vitest";
import { loadCrawlerPolicy, offlineCrawlerPolicy, safeCrawlerPolicy } from "../index.js";

describe("crawler policy presets", () => {
  it("keeps the PRD safe defaults slow and scoped", () => {
    expect(safeCrawlerPolicy.profile).toBe("safe");
    expect(safeCrawlerPolicy.allowedHosts).toEqual(["developers.openai.com"]);
    expect(safeCrawlerPolicy.allowedPathPrefixes).toEqual(["/codex"]);
    expect(safeCrawlerPolicy.maxConcurrentPageRequestsPerHost).toBe(1);
    expect(safeCrawlerPolicy.minDelayMsBetweenPageRequestsPerHost).toBeGreaterThanOrEqual(5_000);
    expect(safeCrawlerPolicy.crawlExternalLinks).toBe(false);
  });

  it("forces offline mode to make zero network requests", () => {
    expect(offlineCrawlerPolicy.allowNetworkRequests).toBe(false);
    expect(loadCrawlerPolicy({ env: { CODEX_KB_CRAWLER_PROFILE: "offline" } }).allowNetworkRequests).toBe(false);
    expect(loadCrawlerPolicy({ cliOverrides: { cacheMode: "offline" } }).allowNetworkRequests).toBe(false);
  });

  it("applies supported numeric environment overrides", () => {
    const policy = loadCrawlerPolicy({
      env: {
        CODEX_KB_MAX_TOTAL_REQUESTS_PER_RUN: "12",
        CODEX_KB_REQUEST_TIMEOUT_MS: "1000"
      }
    });

    expect(policy.maxTotalRequestsPerRun).toBe(12);
    expect(policy.requestTimeoutMs).toBe(1000);
  });
});
