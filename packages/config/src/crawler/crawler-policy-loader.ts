import { crawlerPolicySchema } from "./crawler-policy.schema.js";
import type { CrawlerPolicy, CrawlerPolicyOverrides, CrawlerProfile } from "./crawler-policy.js";
import { crawlerPolicyPresets } from "./crawler-policy.presets.js";

export type CrawlerPolicyLoaderOptions = {
  cliOverrides?: CrawlerPolicyOverrides;
  env?: NodeJS.ProcessEnv;
};

const envNumberMap = {
  CODEX_KB_ASSET_DELAY_MS: "minDelayMsBetweenAssetRequestsPerHost",
  CODEX_KB_MAX_ASSET_CONCURRENCY: "maxConcurrentAssetRequestsPerHost",
  CODEX_KB_MAX_PAGE_CONCURRENCY: "maxConcurrentPageRequestsPerHost",
  CODEX_KB_MAX_REQUESTS_PER_MINUTE: "maxRequestsPerMinutePerHost",
  CODEX_KB_MAX_RETRIES: "maxRetries",
  CODEX_KB_MAX_TOTAL_REQUESTS_PER_RUN: "maxTotalRequestsPerRun",
  CODEX_KB_PAGE_DELAY_MS: "minDelayMsBetweenPageRequestsPerHost",
  CODEX_KB_REQUEST_TIMEOUT_MS: "requestTimeoutMs"
} as const;

export function loadCrawlerPolicy(options: CrawlerPolicyLoaderOptions = {}): CrawlerPolicy {
  const env = options.env ?? process.env;
  const profile = readProfile(env.CODEX_KB_CRAWLER_PROFILE) ?? "safe";
  const basePolicy = crawlerPolicyPresets[profile];
  const envOverrides = readEnvOverrides(env);
  const mergedPolicy = {
    ...basePolicy,
    ...envOverrides,
    ...options.cliOverrides
  };

  if (mergedPolicy.profile === "offline" || mergedPolicy.cacheMode === "offline") {
    mergedPolicy.allowNetworkRequests = false;
    mergedPolicy.cacheMode = "offline";
  }

  return crawlerPolicySchema.parse(mergedPolicy);
}

function readProfile(value: string | undefined): CrawlerProfile | undefined {
  if (value === "offline" || value === "safe" || value === "balanced") {
    return value;
  }

  return undefined;
}

function readEnvOverrides(env: NodeJS.ProcessEnv): CrawlerPolicyOverrides {
  const overrides: CrawlerPolicyOverrides = {};

  if (env.CODEX_KB_CACHE_MODE === "prefer-cache" || env.CODEX_KB_CACHE_MODE === "refresh" || env.CODEX_KB_CACHE_MODE === "force" || env.CODEX_KB_CACHE_MODE === "offline") {
    overrides.cacheMode = env.CODEX_KB_CACHE_MODE;
  }

  if (env.CODEX_KB_CRAWLER_PROFILE === "offline" || env.CODEX_KB_CRAWLER_PROFILE === "safe" || env.CODEX_KB_CRAWLER_PROFILE === "balanced") {
    overrides.profile = env.CODEX_KB_CRAWLER_PROFILE;
  }

  for (const [envName, policyKey] of Object.entries(envNumberMap)) {
    const rawValue = env[envName];
    if (rawValue === undefined) {
      continue;
    }

    const numericValue = Number.parseInt(rawValue, 10);
    if (!Number.isNaN(numericValue)) {
      overrides[policyKey] = numericValue;
    }
  }

  return overrides;
}
