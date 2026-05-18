import { splitFrontMatter, extractHeadingMatches } from "@unofficial-codex-wiki/chunker";
import { slugifyHeading } from "@unofficial-codex-wiki/core";
import type { ManifestPage } from "@unofficial-codex-wiki/core";
import type { PipelineContext } from "../pipeline-context.js";

export type ReadStepInput = {
  pageOrSlug: string;
};

export type ReadStepResult = {
  page: ManifestPage;
  content: string;
};

export async function runReadStep(context: PipelineContext, input: ReadStepInput): Promise<ReadStepResult> {
  if (!await context.storage.latestManifestExists()) {
    throw new Error("Read input missing: data/latest/manifest.json is missing. Run docs:transform first.");
  }

  const manifest = await context.storage.readLatestManifest();
  const parsedReference = parseReference(input.pageOrSlug);
  const page = findPage(manifest.pages, parsedReference.pageReference);
  if (page === undefined) {
    throw new Error(`Local Markdown page not found: ${input.pageOrSlug}`);
  }

  const markdown = await context.storage.readGeneratedMarkdown(page.localMarkdownPath);
  if (parsedReference.anchor === undefined) {
    return {
      page,
      content: markdown
    };
  }

  return {
    page,
    content: extractSection(markdown, parsedReference.anchor)
  };
}

type ParsedReference = {
  pageReference: string;
  anchor?: string;
};

function parseReference(pageOrSlug: string): ParsedReference {
  const hashIndex = pageOrSlug.indexOf("#");
  if (hashIndex === -1) {
    return {
      pageReference: pageOrSlug
    };
  }

  return {
    pageReference: pageOrSlug.slice(0, hashIndex),
    anchor: pageOrSlug.slice(hashIndex + 1)
  };
}

function findPage(pages: readonly ManifestPage[], pageReference: string): ManifestPage | undefined {
  const normalizedReference = pageReference
    .replace(/^generated\/markdown\/codex\//u, "")
    .replace(/\.md$/u, "")
    .replace(/^\/codex\/?/u, "")
    .replace(/^codex\//u, "");

  return pages.find((page) => {
    const localId = page.localMarkdownPath
      .replace(/^generated\/markdown\/codex\//u, "")
      .replace(/\.md$/u, "");

    return page.id === pageReference
      || page.id === normalizedReference
      || localId === normalizedReference
      || page.localMarkdownPath === pageReference
      || page.sourceUrl === pageReference
      || page.canonicalUrl === pageReference
      || page.markdownSourceUrl === pageReference
      || slugifyHeading(page.title) === normalizedReference;
  });
}

function extractSection(markdown: string, anchor: string): string {
  const body = splitFrontMatter(markdown).body;
  const anchorSlug = slugifyHeading(anchor);
  const headings = extractHeadingMatches(body);
  const heading = headings.find((candidate) => candidate.slug === anchorSlug);
  if (heading === undefined) {
    throw new Error(`Heading anchor not found: #${anchor}`);
  }

  const lines = body.split("\n");
  const nextHeading = headings.find((candidate) => (
    candidate.lineIndex > heading.lineIndex
    && candidate.depth <= heading.depth
  ));

  return `${lines.slice(heading.lineIndex, nextHeading?.lineIndex).join("\n").trim()}\n`;
}
