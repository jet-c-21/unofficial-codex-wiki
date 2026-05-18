import { slugifyHeading, type DocHeading } from "@unofficial-codex-wiki/core";

export function extractMarkdownHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const headingStack: string[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
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
    const parsedHeading = parseHeadingText(rawText);
    headingStack.length = depth - 1;
    headingStack[depth - 1] = parsedHeading.text;

    headings.push({
      depth,
      text: parsedHeading.text,
      slug: parsedHeading.slug,
      path: headingStack.slice(0, depth)
    });
  }

  return headings;
}

export function extractMarkdownTitle(markdown: string, fallback: string): string {
  const firstHeading = extractMarkdownHeadings(markdown).find((heading) => heading.depth === 1);
  return firstHeading?.text ?? fallback;
}

function parseHeadingText(rawText: string): { text: string; slug: string } {
  const withoutClosingHashes = rawText.replace(/\s+#+\s*$/u, "").trim();
  const explicitIdMatch = /\s+\{#([A-Za-z0-9_-]+)\}\s*$/u.exec(withoutClosingHashes);
  const text = stripInlineMarkdown((explicitIdMatch === null
    ? withoutClosingHashes
    : withoutClosingHashes.slice(0, explicitIdMatch.index)).trim());
  const explicitSlug = explicitIdMatch?.[1];

  return {
    text,
    slug: explicitSlug ?? slugifyHeading(text)
  };
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/[*_~]/gu, "")
    .trim();
}
