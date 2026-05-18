export type CrawlerProfile = "offline" | "safe" | "balanced";
export type CacheMode = "prefer-cache" | "refresh" | "force" | "offline";

export type CrawlerPolicy = {
  profile: CrawlerProfile;
  userAgent: string;
  allowedHosts: readonly string[];
  allowedPathPrefixes: readonly string[];
  allowNetworkRequests: boolean;
  cacheMode: CacheMode;
  crawlExternalLinks: boolean;
  crawlExternalAssets: boolean;
  failOnOutOfScopeUrl: boolean;
  maxConcurrentPageRequestsPerHost: number;
  maxConcurrentAssetRequestsPerHost: number;
  minDelayMsBetweenPageRequestsPerHost: number;
  minDelayMsBetweenAssetRequestsPerHost: number;
  maxRequestsPerMinutePerHost: number;
  maxTotalRequestsPerRun: number;
  requestTimeoutMs: number;
  maxRetries: number;
  retryableStatusCodes: readonly number[];
  initialRetryDelayMs: number;
  maxRetryDelayMs: number;
  pauseOn429WithoutRetryAfterMs: number;
  respectRetryAfterHeader: boolean;
  useJitter: boolean;
};

export type CrawlerPolicyOverrides = Partial<CrawlerPolicy>;
