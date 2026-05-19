import { sha256, type DocChunk, type ManifestPage } from "@unofficial-codex-wiki/core";
import { extractHeadingMatches, type HeadingMatch } from "./heading-extractor.js";

export type ChunkingOptions = {
  targetChunkChars?: number;
  maxChunkChars?: number;
  minChunkChars?: number;
};

export const defaultChunkingOptions = {
  targetChunkChars: 4_000,
  maxChunkChars: 8_000,
  minChunkChars: 200
} as const satisfies Required<ChunkingOptions>;

export function chunkMarkdownPage(page: ManifestPage, markdownBody: string, options: ChunkingOptions = {}): DocChunk[] {
  const resolvedOptions = {
    ...defaultChunkingOptions,
    ...options
  };
  const sections = splitIntoHeadingSections(markdownBody);
  const chunks: DocChunk[] = [];

  for (const section of sections) {
    const sectionContent = section.content.trim();
    if (sectionContent.length === 0) {
      continue;
    }

    const pieces = splitOversizedSection(sectionContent, resolvedOptions.maxChunkChars);
    for (const piece of pieces) {
      if (piece.trim().length === 0) {
        continue;
      }

      chunks.push(createChunk(page, piece.trim(), section.headingPath, chunks.length));
    }
  }

  return chunks;
}

type MarkdownSection = {
  headingPath: string[];
  content: string;
};

function splitIntoHeadingSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split("\n");
  const headings = extractHeadingMatches(markdown);

  if (headings.length === 0) {
    return [{
      headingPath: [],
      content: markdown
    }];
  }

  const sections: MarkdownSection[] = [];
  const firstHeading = headings[0];
  if (firstHeading !== undefined && firstHeading.lineIndex > 0) {
    sections.push({
      headingPath: [],
      content: lines.slice(0, firstHeading.lineIndex).join("\n")
    });
  }

  for (const [headingIndex, heading] of headings.entries()) {
    const nextHeading = headings[headingIndex + 1];
    sections.push({
      headingPath: heading.path,
      content: lines.slice(heading.lineIndex, nextHeading?.lineIndex).join("\n")
    });
  }

  return sections;
}

function splitOversizedSection(sectionContent: string, maxChunkChars: number): string[] {
  if (sectionContent.length <= maxChunkChars) {
    return [sectionContent];
  }

  const blocks = splitIntoBlocksPreservingFences(sectionContent);
  const chunks: string[] = [];
  let current = "";

  for (const block of blocks) {
    if (current.length === 0) {
      current = block;
      continue;
    }

    if (current.length + 2 + block.length <= maxChunkChars) {
      current = `${current}\n\n${block}`;
      continue;
    }

    chunks.push(current);
    current = block;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function splitIntoBlocksPreservingFences(markdown: string): string[] {
  const blocks: string[] = [];
  const currentLines: string[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      currentLines.push(line);
      continue;
    }

    if (!inFence && line.trim().length === 0) {
      flushCurrentBlock(blocks, currentLines);
      continue;
    }

    currentLines.push(line);
  }

  flushCurrentBlock(blocks, currentLines);
  return blocks;
}

function flushCurrentBlock(blocks: string[], currentLines: string[]): void {
  const block = currentLines.join("\n").trim();
  if (block.length > 0) {
    blocks.push(block);
  }
  currentLines.length = 0;
}

function createChunk(page: ManifestPage, content: string, headingPath: string[], chunkIndex: number): DocChunk {
  return {
    id: `${page.id}#chunk-${chunkIndex + 1}`,
    pageId: page.id,
    title: page.title,
    ...(page.description === undefined ? {} : { description: page.description }),
    sourceUrl: page.sourceUrl,
    canonicalUrl: page.canonicalUrl,
    localMarkdownPath: page.localMarkdownPath,
    headingPath,
    content,
    contentType: "markdown",
    chunkIndex,
    contentHash: sha256(content),
    fetchedAt: page.fetchedAt
  };
}
