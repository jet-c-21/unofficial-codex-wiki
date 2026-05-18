import path from "node:path";
import { slugifyHeading } from "@unofficial-codex-wiki/core";

export type MarkdownLink = {
  href: string;
  text: string;
  image: boolean;
};

const inlineLinkPattern = /(!?)\[([^\]\n]*)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/gu;

export function extractMarkdownLinks(markdown: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    for (const match of line.matchAll(inlineLinkPattern)) {
      links.push({
        href: match[3] ?? "",
        text: match[2] ?? "",
        image: (match[1] ?? "") === "!"
      });
    }
  }

  return links;
}

export function extractHeadingSlugs(markdown: string): Set<string> {
  const slugs = new Set<string>();
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    for (const anchorTarget of extractExplicitAnchorTargets(line)) {
      slugs.add(anchorTarget);
    }

    const match = /^(#{1,6})\s+(.+?)\s*$/u.exec(line);
    const rawText = match?.[2];
    if (rawText === undefined) {
      continue;
    }

    const explicitHeadingId = extractExplicitHeadingId(rawText);
    if (explicitHeadingId !== undefined) {
      slugs.add(explicitHeadingId);
    }

    slugs.add(slugifyHeading(stripHeadingSyntax(rawText)));
  }

  return slugs;
}

export function resolveMarkdownHref(fromLocalPath: string, href: string): { localPath: string; anchor?: string } {
  const [pathPart = "", anchor] = href.split("#", 2);
  if (pathPart.length === 0) {
    const resolved: { localPath: string; anchor?: string } = {
      localPath: fromLocalPath
    };
    if (anchor !== undefined) {
      resolved.anchor = anchor;
    }
    return resolved;
  }

  const localPath = path.posix.normalize(path.posix.join(path.posix.dirname(fromLocalPath), pathPart));
  const resolved: { localPath: string; anchor?: string } = {
    localPath
  };
  if (anchor !== undefined) {
    resolved.anchor = anchor;
  }
  return resolved;
}

export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/iu.test(href);
}

function stripHeadingSyntax(rawText: string): string {
  return rawText
    .replace(/\s+#+\s*$/u, "")
    .replace(/\s+\{#[A-Za-z0-9_-]+\}\s*$/u, "")
    .replace(/<[^>]+>/gu, "")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/[*_~]/gu, "")
    .trim();
}

function extractExplicitHeadingId(rawText: string): string | undefined {
  const match = /\s+\{#([A-Za-z0-9_-]+)\}\s*$/u.exec(rawText);
  return match?.[1];
}

function extractExplicitAnchorTargets(line: string): string[] {
  const targets: string[] = [];
  const attributePattern = /\b(?:id|name)=["']([^"']+)["']/giu;

  for (const match of line.matchAll(attributePattern)) {
    const target = match[1]?.trim();
    if (target !== undefined && target.length > 0) {
      targets.push(target);
    }
  }

  return targets;
}
