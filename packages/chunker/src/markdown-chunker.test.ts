import { describe, expect, it } from "vitest";
import { createAgentDocPageRecord } from "./agent-page-record.js";
import { chunkMarkdownPage } from "./markdown-chunker.js";

const manifestPage = {
  id: "cli",
  title: "Codex CLI",
  sourceUrl: "https://developers.openai.com/codex/cli",
  canonicalUrl: "https://developers.openai.com/codex/cli",
  markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
  localMarkdownPath: "generated/markdown/codex/cli.md",
  localJsonlChunkIds: [],
  contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  fetchedAt: "2026-05-19T00:00:00.000Z",
  status: "new" as const
};

describe("chunkMarkdownPage", () => {
  it("creates heading-aware chunks without splitting fenced code blocks", () => {
    const chunks = chunkMarkdownPage(manifestPage, [
      "# Codex CLI",
      "",
      "Intro content.",
      "",
      "## Install",
      "",
      "```sh",
      "npm install -g codex",
      "```",
      "",
      "## Configure",
      "",
      "Use configuration files."
    ].join("\n"), { maxChunkChars: 80 });

    expect(chunks.map((chunk) => chunk.headingPath)).toEqual([
      ["Codex CLI"],
      ["Codex CLI", "Install"],
      ["Codex CLI", "Configure"]
    ]);
    expect(chunks[1]?.content).toContain("```sh\nnpm install -g codex\n```");
  });

  it("creates JSONL page records from original Markdown body content", () => {
    const record = createAgentDocPageRecord(manifestPage, "# Codex CLI\n\nSee [Agents](agents.md) and [GitHub](https://github.com/openai/codex).\n");

    expect(record).toMatchObject({
      recordType: "page",
      id: "cli",
      contentType: "markdown",
      headings: ["Codex CLI"]
    });
    expect(record.content).not.toContain("generated_by");
    expect(record.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        originalHref: "agents.md",
        localHref: "agents.md",
        type: "internal"
      }),
      expect.objectContaining({
        originalHref: "https://github.com/openai/codex",
        localHref: null,
        type: "external"
      })
    ]));
  });
});
