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
  localRawMarkdownPath?: string;
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

  const normalizedBody = normalizeMarkdownBody(input.rawMarkdown);
  const title = extractMarkdownTitle(normalizedBody, normalizedUrl.id);
  const headings = extractMarkdownHeadings(normalizedBody);
  const headingSlugs = new Set(headings.map((heading) => heading.slug));
  const rewriteResult = rewriteMarkdownLinks({
    markdown: normalizedBody,
    currentEntry,
    manifestPathMap: input.manifestPathMap,
    headingSlugs
  });
  const contentHash = sha256(rewriteResult.markdown);

  const page: DocPage = {
    id: normalizedUrl.id,
    title,
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

  if (normalizedUrl.section !== undefined) {
    page.section = normalizedUrl.section;
  }

  const manifestPage: ManifestPage = {
    id: page.id,
    title: page.title,
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

  if (page.section !== undefined) {
    manifestPage.section = page.section;
  }

  return {
    page,
    manifestPage,
    markdown: `${buildMarkdownFrontMatter(page)}${rewriteResult.markdown}`
  };
}
