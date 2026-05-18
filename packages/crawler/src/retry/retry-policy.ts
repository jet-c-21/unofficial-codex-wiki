import type { CrawlerPolicy } from "@unofficial-codex-wiki/config";

export type RetryDecision = {
  shouldRetry: boolean;
  delayMs: number;
};

export function shouldRetryStatus(status: number, policy: CrawlerPolicy): boolean {
  return policy.retryableStatusCodes.includes(status);
}

export function getRetryDecision(input: {
  attemptIndex: number;
  status?: number;
  error?: unknown;
  retryAfterHeader?: string;
  policy: CrawlerPolicy;
}): RetryDecision {
  if (input.attemptIndex >= input.policy.maxRetries) {
    return { shouldRetry: false, delayMs: 0 };
  }

  const retryable = input.error !== undefined || (input.status !== undefined && shouldRetryStatus(input.status, input.policy));
  if (!retryable) {
    return { shouldRetry: false, delayMs: 0 };
  }

  const retryAfterMs = parseRetryAfterMs(input.retryAfterHeader);
  if (input.policy.respectRetryAfterHeader && retryAfterMs !== undefined) {
    return { shouldRetry: true, delayMs: retryAfterMs };
  }

  if (input.status === 429 && input.retryAfterHeader === undefined) {
    return { shouldRetry: true, delayMs: input.policy.pauseOn429WithoutRetryAfterMs };
  }

  const exponentialDelay = input.policy.initialRetryDelayMs * 2 ** input.attemptIndex;
  return {
    shouldRetry: true,
    delayMs: Math.min(exponentialDelay, input.policy.maxRetryDelayMs)
  };
}

function parseRetryAfterMs(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const seconds = Number.parseInt(value, 10);
  if (!Number.isNaN(seconds)) {
    return seconds * 1_000;
  }

  const timestampMs = Date.parse(value);
  if (Number.isNaN(timestampMs)) {
    return undefined;
  }

  return Math.max(timestampMs - Date.now(), 0);
}
