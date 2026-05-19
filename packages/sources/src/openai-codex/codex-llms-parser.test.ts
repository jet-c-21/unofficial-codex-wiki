import { describe, expect, it } from "vitest";
import { parseCodexLlmsTxt } from "./codex-llms-parser.js";

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
});
