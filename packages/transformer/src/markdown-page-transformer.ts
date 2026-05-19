import { sha256, type DocPage, type ManifestPage } from "@unofficial-codex-wiki/core";
import { normalizeCodexPageUrl } from "@unofficial-codex-wiki/sources";
import { buildMarkdownFrontMatter } from "./frontmatter-builder.js";
import { extractMarkdownHeadings, extractMarkdownTitle } from "./headings.js";
import { rewriteMarkdownLinks } from "./link-rewriter.js";
import { type ManifestPathMap, resolveManifestPathEntry } from "./manifest-path-map.js";
import { normalizeMarkdownBody } from "./markdown-normalizer.js";

export type TransformMarkdownPageInput = {
  sourceUrl: string;
  rawMarkdown: string;
  fetchedAt: string;
  manifestPathMap: ManifestPathMap;
  description?: string;
  localRawMarkdownPath?: string;
  localRawHtmlPath?: string;
};

export type TransformedMarkdownPage = {
  page: DocPage;
  manifestPage: ManifestPage;
  markdown: string;
};

export function transformMarkdownPage(input: TransformMarkdownPageInput): TransformedMarkdownPage {
  const normalizedUrl = normalizeCodexPageUrl(input.sourceUrl);
  const currentEntry = resolveManifestPathEntry(input.manifestPathMap, input.sourceUrl);

  if (currentEntry === undefined) {
    throw new Error(`Missing manifest path map entry for ${input.sourceUrl}`);
  }

  const description = normalizeDescription(input.description);
  const normalizedBody = normalizeMarkdownBody(input.rawMarkdown);
  const markdownWithDescription = insertDescriptionAfterTopHeading(normalizedBody, description);
  const title = extractMarkdownTitle(markdownWithDescription, normalizedUrl.id);
  const headings = extractMarkdownHeadings(markdownWithDescription);
  const headingSlugs = new Set(headings.map((heading) => heading.slug));
  const rewriteResult = rewriteMarkdownLinks({
    markdown: markdownWithDescription,
    currentEntry,
    manifestPathMap: input.manifestPathMap,
    headingSlugs
  });
  const contentHash = sha256(rewriteResult.markdown);

  const page: DocPage = {
    id: normalizedUrl.id,
    title,
    ...(description === undefined ? {} : { description }),
    sourceUrl: normalizedUrl.canonicalUrl,
    canonicalUrl: normalizedUrl.canonicalUrl,
    markdownSourceUrl: normalizedUrl.markdownSourceUrl,
    localMarkdownPath: currentEntry.localMarkdownPath,
    contentHash,
    fetchedAt: input.fetchedAt,
    headings,
    links: rewriteResult.links,
    assets: []
  };

  if (input.localRawMarkdownPath !== undefined) {
    page.localRawMarkdownPath = input.localRawMarkdownPath;
  }

  if (input.localRawHtmlPath !== undefined) {
    page.localRawHtmlPath = input.localRawHtmlPath;
  }

  if (normalizedUrl.section !== undefined) {
    page.section = normalizedUrl.section;
  }

  const manifestPage: ManifestPage = {
    id: page.id,
    title: page.title,
    ...(page.description === undefined ? {} : { description: page.description }),
    sourceUrl: page.sourceUrl,
    canonicalUrl: page.canonicalUrl,
    markdownSourceUrl: normalizedUrl.markdownSourceUrl,
    localMarkdownPath: page.localMarkdownPath,
    localJsonlChunkIds: [],
    contentHash: page.contentHash,
    fetchedAt: page.fetchedAt,
    status: "new"
  };

  if (page.localRawMarkdownPath !== undefined) {
    manifestPage.localRawMarkdownPath = page.localRawMarkdownPath;
  }

  if (page.localRawHtmlPath !== undefined) {
    manifestPage.localRawHtmlPath = page.localRawHtmlPath;
  }

  if (page.section !== undefined) {
    manifestPage.section = page.section;
  }

  return {
    page,
    manifestPage,
    markdown: `${buildMarkdownFrontMatter(page)}${rewriteResult.markdown}`
  };
}

function normalizeDescription(description: string | undefined): string | undefined {
  const normalizedDescription = description?.trim().replace(/\s+/gu, " ");
  return normalizedDescription === undefined || normalizedDescription.length === 0 ? undefined : normalizedDescription;
}

function insertDescriptionAfterTopHeading(markdown: string, description: string | undefined): string {
  if (description === undefined || markdown.includes(description)) {
    return markdown;
  }

  const blockquoteDescription = `> ${description}`;
  const lines = markdown.split("\n");
  const headingIndex = lines.findIndex((line) => /^#\s+\S/u.test(line));
  if (headingIndex === -1) {
    return `${blockquoteDescription}\n\n${markdown}`;
  }

  let insertionIndex = headingIndex + 1;
  while (lines[insertionIndex] !== undefined && lines[insertionIndex]?.trim().length === 0) {
    insertionIndex += 1;
  }

  return [
    ...lines.slice(0, headingIndex + 1),
    "",
    blockquoteDescription,
    "",
    ...lines.slice(insertionIndex)
  ].join("\n");
}
