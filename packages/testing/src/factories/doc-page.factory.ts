import type { DocPage } from "@unofficial-codex-wiki/core";

export function createDocPageFixture(overrides: Partial<DocPage> = {}): DocPage {
  return {
    id: "codex-test-page",
    title: "Codex Test Page",
    sourceUrl: "https://developers.openai.com/codex/test",
    canonicalUrl: "https://developers.openai.com/codex/test",
    localMarkdownPath: "generated/markdown/codex/test.md",
    contentHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    fetchedAt: "2026-05-18T00:00:00.000Z",
    headings: [],
    links: [],
    assets: [],
    ...overrides
  };
}
