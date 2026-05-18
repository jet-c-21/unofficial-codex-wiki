import { safeCrawlerPolicy } from "@unofficial-codex-wiki/config";
import { describe, expect, it } from "vitest";
import { getRetryDecision, shouldRetryStatus } from "./retry-policy.js";

describe("retry policy", () => {
  it("retries only PRD-approved statuses", () => {
    expect(shouldRetryStatus(500, safeCrawlerPolicy)).toBe(true);
    expect(shouldRetryStatus(429, safeCrawlerPolicy)).toBe(true);
    expect(shouldRetryStatus(404, safeCrawlerPolicy)).toBe(false);
    expect(shouldRetryStatus(403, safeCrawlerPolicy)).toBe(false);
  });

  it("stops after max retries", () => {
    expect(getRetryDecision({
      attemptIndex: safeCrawlerPolicy.maxRetries,
      status: 500,
      policy: safeCrawlerPolicy
    }).shouldRetry).toBe(false);
  });
});
