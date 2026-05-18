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

  it("rewrites known source aliases and preserves non-page Codex resources", () => {
    const manifestPathMap = buildManifestPathMap([
      "https://developers.openai.com/codex/auth.md",
      "https://developers.openai.com/codex/cli/features.md",
      "https://developers.openai.com/codex/cli/slash-commands.md",
      "https://developers.openai.com/codex/noninteractive.md",
      "https://developers.openai.com/codex/use-cases",
      "https://developers.openai.com/codex/workflows.md"
    ]);

    const result = transformMarkdownPage({
      sourceUrl: "https://developers.openai.com/codex/cli/features.md",
      fetchedAt: "2026-05-19T00:00:00.000Z",
      manifestPathMap,
      rawMarkdown: [
        "# CLI features",
        "",
        "See [slash commands](https://developers.openai.com/codex/guides/slash-commands), [CI auth](https://developers.openai.com/codex/auth/ci-cd-auth), [use cases](https://developers.openai.com/codex/use-cases), [file inputs](/api/docs/guides/file-inputs), [schema](https://developers.openai.com/codex/config-schema.json), and [terms](https://developers.openai.com/codex/codex-for-oss-terms)."
      ].join("\n")
    });

    expect(result.markdown).toContain("See [slash commands](slash-commands.md), [CI auth](../noninteractive.md#authenticate-in-ci), [use cases](../use-cases.md), [file inputs](https://developers.openai.com/api/docs/guides/file-inputs), [schema](https://developers.openai.com/codex/config-schema.json), and [terms](https://developers.openai.com/codex/codex-for-oss-terms).");
    expect(result.page.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        originalHref: "https://developers.openai.com/codex/guides/slash-commands",
        localHref: "slash-commands.md",
        type: "internal",
        resolved: true
      }),
      expect.objectContaining({
        originalHref: "https://developers.openai.com/codex/config-schema.json",
        localHref: null,
        type: "external",
        resolved: true
      })
    ]));
  });

  it("rewrites known source anchor aliases", () => {
    const manifestPathMap = buildManifestPathMap([
      "https://developers.openai.com/codex/cli/slash-commands.md"
    ]);

    const result = transformMarkdownPage({
      sourceUrl: "https://developers.openai.com/codex/cli/slash-commands.md",
      fetchedAt: "2026-05-19T00:00:00.000Z",
      manifestPathMap,
      rawMarkdown: [
        "# Slash commands in Codex CLI",
        "",
        "See [`/goal`](#set-or-view-an-experimental-task-goal-with-goal).",
        "",
        "### Set an experimental goal with `/goal`"
      ].join("\n")
    });

    expect(result.markdown).toContain("See [`/goal`](#set-an-experimental-goal-with-goal).");
  });
});
