import { describe, expect, it } from "vitest";
import { extractCodexCoverageReferenceUrls, parseCodexLlmsTxt } from "./codex-llms-parser.js";

describe("parseCodexLlmsTxt", () => {
  it("extracts in-scope Markdown links and deduplicates canonical pages", () => {
    const links = parseCodexLlmsTxt(`
# Codex
- [CLI](https://developers.openai.com/codex/cli.md): Terminal client
- [CLI duplicate](/codex/cli.md): Duplicate
- [Commands](/codex/app/commands.md): Commands
- [External](https://platform.openai.com/docs/foo.md): Ignore
- [Combined](https://developers.openai.com/codex/llms-full.txt): Ignore
`);

    expect(links.map((link) => link.markdownSourceUrl)).toEqual([
      "https://developers.openai.com/codex/cli.md",
      "https://developers.openai.com/codex/app/commands.md"
    ]);
    expect(links.map((link) => link.description)).toEqual([
      "Terminal client",
      "Commands"
    ]);
  });

  it("extracts unique in-scope page URLs from llms-full style reference content", () => {
    const urls = extractCodexCoverageReferenceUrls(`
# Codex
See https://developers.openai.com/codex/cli and /codex/app/features.md.
Ignore https://developers.openai.com/api/docs/models.md and /codex/use-cases/background-codex-collection1.png.
Duplicate [CLI](/codex/cli.md).
    `);

    expect(urls).toEqual([
      "https://developers.openai.com/codex/app/features.md",
      "https://developers.openai.com/codex/cli.md"
    ]);
  });
});
