import { describe, expect, it } from "vitest";
import { isCodexUseCasesPageUrl, parseCodexUseCasesHtml } from "./codex-use-cases-discovery.js";

describe("Codex use cases discovery", () => {
  it("extracts canonical use-case pages and ignores filter states", () => {
    const links = parseCodexUseCasesHtml(`
      <a href="/codex/use-cases?category=engineering">Engineering filter</a>
      <a href="/codex/use-cases/collections/production-systems">Production systems</a>
      <a href="/codex/use-cases/github-code-reviews">GitHub code reviews</a>
      <a href="/codex/use-cases/github-code-reviews?team=engineering">Duplicate filtered card</a>
      <a href="/codex/use-cases/query-tabular-data#starter-prompt">Alias-like card with anchor</a>
      <a href="/codex/use-cases/background-codex-collection1.png">Image resource</a>
      <a href="/codex/workflows">Existing docs page</a>
      <a href="https://platform.openai.com/docs">External</a>
    `);

    expect(links.map((link) => link.canonicalUrl)).toEqual([
      "https://developers.openai.com/codex/use-cases",
      "https://developers.openai.com/codex/use-cases/collections/production-systems",
      "https://developers.openai.com/codex/use-cases/github-code-reviews",
      "https://developers.openai.com/codex/use-cases/query-tabular-data"
    ]);
  });

  it("identifies use-case HTML pages but not in-article assets", () => {
    expect(isCodexUseCasesPageUrl("https://developers.openai.com/codex/use-cases")).toBe(true);
    expect(isCodexUseCasesPageUrl("/codex/use-cases/github-code-reviews.md")).toBe(true);
    expect(isCodexUseCasesPageUrl("/codex/use-cases/background-codex-collection1.png")).toBe(false);
  });
});
