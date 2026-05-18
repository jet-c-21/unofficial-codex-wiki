import type { DocLink } from "@unofficial-codex-wiki/core";

const inlineLinkPattern = /(!?)\[([^\]\n]*)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/gu;

export function extractMarkdownLinks(markdown: string): DocLink[] {
  const links: DocLink[] = [];
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
      const imageMarker = match[1] ?? "";
      const text = match[2] ?? "";
      const href = match[3] ?? "";
      links.push({
        text,
        originalHref: href,
        localHref: toLocalHref(href, imageMarker === "!"),
        type: classifyHref(href, imageMarker === "!"),
        resolved: isResolvedHref(href, imageMarker === "!")
      });
    }
  }

  return links;
}

function classifyHref(href: string, image: boolean): DocLink["type"] {
  if (image) {
    return "asset";
  }

  if (href.startsWith("#")) {
    return "anchor";
  }

  if (/^[a-z][a-z0-9+.-]*:/iu.test(href)) {
    return "external";
  }

  return href.includes("#") ? "anchor" : "internal";
}

function toLocalHref(href: string, image: boolean): string | null {
  const type = classifyHref(href, image);
  return type === "external" || type === "asset" ? null : href;
}

function isResolvedHref(href: string, image: boolean): boolean {
  const type = classifyHref(href, image);
  return type === "external" || (type !== "asset" && href.length > 0);
}
