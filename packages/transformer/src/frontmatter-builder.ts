import type { DocPage } from "@unofficial-codex-wiki/core";

export function buildMarkdownFrontMatter(page: DocPage): string {
  const lines = [
    "---",
    `title: ${quoteYamlString(page.title)}`,
    `source_url: ${quoteYamlString(page.sourceUrl)}`,
    `canonical_url: ${quoteYamlString(page.canonicalUrl)}`
  ];

  if (page.markdownSourceUrl !== undefined) {
    lines.push(`markdown_source_url: ${quoteYamlString(page.markdownSourceUrl)}`);
  }

  lines.push(`local_path: ${quoteYamlString(page.localMarkdownPath)}`);

  if (page.section !== undefined) {
    lines.push(`section: ${quoteYamlString(page.section)}`);
  }

  lines.push(
    `fetched_at: ${quoteYamlString(page.fetchedAt)}`,
    `content_hash: ${quoteYamlString(page.contentHash)}`,
    `generated_by: ${quoteYamlString("unofficial-codex-wiki")}`,
    "unofficial_local_mirror: true",
    "---",
    ""
  );

  return lines.join("\n");
}

function quoteYamlString(value: string): string {
  return `"${value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"')}"`;
}
