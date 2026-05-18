import { slugifyHeading, type DocHeading } from "@unofficial-codex-wiki/core";

export type HeadingMatch = DocHeading & {
  lineIndex: number;
};

export function extractHeadingMatches(markdown: string): HeadingMatch[] {
  const headings: HeadingMatch[] = [];
  const headingStack: string[] = [];
  let inFence = false;
  const lines = markdown.split("\n");

  for (const [lineIndex, line] of lines.entries()) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const match = /^(#{1,6})\s+(.+?)\s*$/u.exec(line);
    if (match === null) {
      continue;
    }

    const hashes = match[1];
    const rawText = match[2];
    if (hashes === undefined || rawText === undefined) {
      continue;
    }

    const depth = hashes.length;
    const heading = parseHeading(rawText);
    headingStack.length = depth - 1;
    headingStack[depth - 1] = heading.text;

    headings.push({
      depth,
      text: heading.text,
      slug: heading.slug,
      path: headingStack.slice(0, depth),
      lineIndex
    });
  }

  return headings;
}

function parseHeading(rawText: string): { text: string; slug: string } {
  const withoutClosingHashes = rawText.replace(/\s+#+\s*$/u, "").trim();
  const explicitIdMatch = /\s+\{#([A-Za-z0-9_-]+)\}\s*$/u.exec(withoutClosingHashes);
  const textSource = explicitIdMatch === null ? withoutClosingHashes : withoutClosingHashes.slice(0, explicitIdMatch.index);
  const text = stripInlineMarkdown(textSource);

  return {
    text,
    slug: explicitIdMatch?.[1] ?? slugifyHeading(text)
  };
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/[*_~]/gu, "")
    .trim();
}
