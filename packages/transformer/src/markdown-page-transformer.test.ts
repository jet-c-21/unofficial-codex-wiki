import { describe, expect, it } from "vitest";
import { buildManifestPathMap } from "./manifest-path-map.js";
import { transformMarkdownPage } from "./markdown-page-transformer.js";

describe("transformMarkdownPage", () => {
  it("adds source metadata and rewrites only in-scope Codex links", () => {
    const manifestPathMap = buildManifestPathMap([
      "https://developers.openai.com/codex/cli.md",
      "https://developers.openai.com/codex/agents.md"
    ]);

    const result = transformMarkdownPage({
      sourceUrl: "https://developers.openai.com/codex/cli.md",
      fetchedAt: "2026-05-19T00:00:00.000Z",
      manifestPathMap,
      rawMarkdown: [
        "# Codex CLI",
        "",
        "See [Agents](/codex/agents), [Configuration](/codex/cli#configuration), and [GitHub](https://github.com/openai/codex).",
        "",
        "![Screenshot](https://developers.openai.com/assets/codex/example.png)",
        "",
        "```md",
        "[Do not rewrite](/codex/agents)",
        "```",
        "",
        "## Configuration",
        ""
      ].join("\n")
    });

    expect(result.markdown).toContain('title: "Codex CLI"');
    expect(result.markdown).toContain('source_url: "https://developers.openai.com/codex/cli"');
    expect(result.markdown).toContain('markdown_source_url: "https://developers.openai.com/codex/cli.md"');
    expect(result.markdown).toContain('local_path: "generated/markdown/codex/cli.md"');
    expect(result.markdown).toContain("unofficial_local_mirror: true");
    expect(result.markdown).toContain("See [Agents](agents.md), [Configuration](#configuration), and [GitHub](https://github.com/openai/codex).");
    expect(result.markdown).toContain("[Do not rewrite](/codex/agents)");
    expect(result.markdown).toContain("![Screenshot](https://developers.openai.com/assets/codex/example.png)");
    expect(result.page.headings.map((heading) => heading.slug)).toEqual(["codex-cli", "configuration"]);
    expect(result.page.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        originalHref: "/codex/agents",
        localHref: "agents.md",
        type: "internal",
        resolved: true
      }),
      expect.objectContaining({
        originalHref: "https://github.com/openai/codex",
        localHref: null,
        type: "external",
        resolved: true
      }),
      expect.objectContaining({
        originalHref: "https://developers.openai.com/assets/codex/example.png",
        localHref: null,
        type: "asset",
        resolved: false
      })
    ]));
  });

  it("computes relative paths for nested generated Markdown files", () => {
    const manifestPathMap = buildManifestPathMap([
      "https://developers.openai.com/codex/cli.md",
      "https://developers.openai.com/codex/app/commands.md"
    ]);

    const result = transformMarkdownPage({
      sourceUrl: "https://developers.openai.com/codex/app/commands.md",
      fetchedAt: "2026-05-19T00:00:00.000Z",
      manifestPathMap,
      rawMarkdown: "# Commands\n\nSee [CLI](/codex/cli#configuration).\n"
    });

    expect(result.markdown).toContain("See [CLI](../cli.md#configuration).");
  });
});
