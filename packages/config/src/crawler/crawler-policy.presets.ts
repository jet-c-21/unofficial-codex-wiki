import type { CrawlerPolicy } from "./crawler-policy.js";

export const safeCrawlerPolicy = {
  profile: "safe",
  userAgent: "unofficial-codex-wiki/0.1 (+private local documentation mirror)",
  allowedHosts: ["developers.openai.com"],
  allowedPathPrefixes: ["/codex"],
  allowNetworkRequests: true,
  cacheMode: "prefer-cache",
  crawlExternalLinks: false,
  crawlExternalAssets: false,
  failOnOutOfScopeUrl: true,
  maxConcurrentPageRequestsPerHost: 1,
  maxConcurrentAssetRequestsPerHost: 2,
  minDelayMsBetweenPageRequestsPerHost: 5_000,
  minDelayMsBetweenAssetRequestsPerHost: 2_000,
  maxRequestsPerMinutePerHost: 10,
  maxTotalRequestsPerRun: 300,
  requestTimeoutMs: 30_000,
  maxRetries: 2,
  retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
  initialRetryDelayMs: 5_000,
  maxRetryDelayMs: 60_000,
  pauseOn429WithoutRetryAfterMs: 10 * 60 * 1_000,
  respectRetryAfterHeader: true,
  useJitter: true
} as const satisfies CrawlerPolicy;

export const offlineCrawlerPolicy = {
  ...safeCrawlerPolicy,
  profile: "offline",
  allowNetworkRequests: false,
  cacheMode: "offline",
  maxTotalRequestsPerRun: 1
} as const satisfies CrawlerPolicy;

export const balancedCrawlerPolicy = {
  ...safeCrawlerPolicy,
  profile: "balanced",
  minDelayMsBetweenPageRequestsPerHost: 3_000
} as const satisfies CrawlerPolicy;

export const crawlerPolicyPresets = {
  balanced: balancedCrawlerPolicy,
  offline: offlineCrawlerPolicy,
  safe: safeCrawlerPolicy
} as const;
