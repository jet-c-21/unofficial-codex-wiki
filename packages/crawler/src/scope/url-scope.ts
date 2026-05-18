import type { CrawlerPolicy } from "@unofficial-codex-wiki/config";

export function assertInCrawlerScope(urlValue: string, policy: CrawlerPolicy): void {
  const url = new URL(urlValue);

  if (!policy.allowedHosts.includes(url.hostname)) {
    throw new Error(`Out-of-scope URL host: ${urlValue}`);
  }

  if (!policy.allowedPathPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
    throw new Error(`Out-of-scope URL path: ${urlValue}`);
  }
}
