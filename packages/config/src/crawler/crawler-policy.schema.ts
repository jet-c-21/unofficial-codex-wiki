import { z } from "zod";

export const crawlerProfileSchema = z.enum(["offline", "safe", "balanced"]);
export const cacheModeSchema = z.enum(["prefer-cache", "refresh", "force", "offline"]);

export const crawlerPolicySchema = z.object({
  profile: crawlerProfileSchema,
  userAgent: z.string().min(1),
  allowedHosts: z.array(z.string().min(1)).min(1),
  allowedPathPrefixes: z.array(z.string().startsWith("/")).min(1),
  allowNetworkRequests: z.boolean(),
  cacheMode: cacheModeSchema,
  crawlExternalLinks: z.boolean(),
  crawlExternalAssets: z.boolean(),
  failOnOutOfScopeUrl: z.boolean(),
  maxConcurrentPageRequestsPerHost: z.number().int().positive(),
  maxConcurrentAssetRequestsPerHost: z.number().int().positive(),
  minDelayMsBetweenPageRequestsPerHost: z.number().int().nonnegative(),
  minDelayMsBetweenAssetRequestsPerHost: z.number().int().nonnegative(),
  maxRequestsPerMinutePerHost: z.number().int().positive(),
  maxTotalRequestsPerRun: z.number().int().positive(),
  requestTimeoutMs: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
  retryableStatusCodes: z.array(z.number().int().min(100).max(599)),
  initialRetryDelayMs: z.number().int().nonnegative(),
  maxRetryDelayMs: z.number().int().nonnegative(),
  pauseOn429WithoutRetryAfterMs: z.number().int().nonnegative(),
  respectRetryAfterHeader: z.boolean(),
  useJitter: z.boolean()
});
