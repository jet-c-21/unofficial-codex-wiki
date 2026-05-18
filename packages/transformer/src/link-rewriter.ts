import path from "node:path";
import { slugifyHeading, type DocLink } from "@unofficial-codex-wiki/core";
import { isAllowedCodexUrl, normalizeCodexPageUrl } from "@unofficial-codex-wiki/sources";
import type { ManifestPathMap, ManifestPathMapEntry } from "./manifest-path-map.js";

export type RewriteMarkdownLinksInput = {
  markdown: string;
  currentEntry: ManifestPathMapEntry;
  manifestPathMap: ManifestPathMap;
  headingSlugs: ReadonlySet<string>;
};

export type RewriteMarkdownLinksResult = {
  markdown: string;
  links: DocLink[];
};

const inlineLinkPattern = /(!?)\[([^\]\n]*)\]\(([^)\s]+)((?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?)\)/gu;

export function rewriteMarkdownLinks(input: RewriteMarkdownLinksInput): RewriteMarkdownLinksResult {
  const links: DocLink[] = [];
  const lines: string[] = [];
  let inFence = false;

  for (const line of input.markdown.split("\n")) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      lines.push(line);
      continue;
    }

    if (inFence) {
      lines.push(line);
      continue;
    }

    lines.push(line.replace(inlineLinkPattern, (fullMatch, imageMarker: string, text: string, href: string, titleSuffix: string) => {
      const rewritten = rewriteHref({
        href,
        image: imageMarker === "!",
        text,
        currentEntry: input.currentEntry,
        manifestPathMap: input.manifestPathMap,
        headingSlugs: input.headingSlugs
      });

      links.push(rewritten.link);

      if (rewritten.rewrittenHref === href) {
        return fullMatch;
      }

      return `${imageMarker}[${text}](${rewritten.rewrittenHref}${titleSuffix})`;
    }));
  }

  return {
    markdown: lines.join("\n"),
    links
  };
}

type RewriteHrefInput = {
  href: string;
  image: boolean;
  text: string;
  currentEntry: ManifestPathMapEntry;
  manifestPathMap: ManifestPathMap;
  headingSlugs: ReadonlySet<string>;
};

type RewriteHrefResult = {
  rewrittenHref: string;
  link: DocLink;
};

function rewriteHref(input: RewriteHrefInput): RewriteHrefResult {
  if (input.image) {
    return preserveLink(input.href, input.text, "asset", false);
  }

  if (input.href.startsWith("#")) {
    const rewrittenHref = resolveKnownAnchorAlias(input.currentEntry.id, input.href);
    const resolved = input.headingSlugs.has(anchorToSlug(rewrittenHref));
    return {
      rewrittenHref,
      link: {
        text: input.text,
        originalHref: input.href,
        localHref: rewrittenHref,
        type: "anchor",
        resolved
      }
    };
  }

  const absoluteHref = toAbsoluteHref(input.href, input.currentEntry.markdownSourceUrl);

  if (!isAllowedCodexUrl(absoluteHref)) {
    return preserveLink(input.href, input.text, "external", true);
  }

  if (isKnownNonDocumentationCodexResource(absoluteHref)) {
    return preserveLink(input.href, input.text, "external", true);
  }

  const aliasedHref = resolveKnownPageAlias(absoluteHref);
  const target = findEntryForHref(input.manifestPathMap, aliasedHref);
  if (target === undefined) {
    return preserveLink(input.href, input.text, "internal", false);
  }

  const hash = resolveKnownAnchorAlias(target.id, getHash(aliasedHref));
  const rewrittenHref = toRelativeMarkdownHref(input.currentEntry.localMarkdownPath, target.localMarkdownPath, hash);

  return {
    rewrittenHref,
    link: {
      text: input.text,
      originalHref: input.href,
      localHref: rewrittenHref,
      type: hash === "" ? "internal" : "anchor",
      resolved: true
    }
  };
}

function preserveLink(href: string, text: string, type: DocLink["type"], resolved: boolean): RewriteHrefResult {
  return {
    rewrittenHref: href,
    link: {
      text,
      originalHref: href,
      localHref: null,
      type,
      resolved
    }
  };
}

function toAbsoluteHref(href: string, currentMarkdownSourceUrl: string): string {
  try {
    return new URL(href, currentMarkdownSourceUrl).toString();
  } catch {
    return href;
  }
}

function findEntryForHref(pathMap: ManifestPathMap, href: string): ManifestPathMapEntry | undefined {
  const normalized = normalizeCodexPageUrl(href);
  return pathMap.byCanonicalUrl.get(normalized.canonicalUrl) ?? pathMap.byMarkdownSourceUrl.get(normalized.markdownSourceUrl);
}

function getHash(href: string): string {
  const hashIndex = href.indexOf("#");
  return hashIndex === -1 ? "" : href.slice(hashIndex);
}

function toRelativeMarkdownHref(fromPath: string, toPath: string, hash: string): string {
  if (fromPath === toPath) {
    return hash === "" ? `./${path.posix.basename(toPath)}` : hash;
  }

  const relativePath = path.posix.relative(path.posix.dirname(fromPath), toPath);
  return `${relativePath}${hash}`;
}

function anchorToSlug(anchorHref: string): string {
  const anchorText = anchorHref.slice(1);
  try {
    return slugifyHeading(decodeURIComponent(anchorText));
  } catch {
    return slugifyHeading(anchorText);
  }
}

const knownPageAliases = new Map<string, string>([
  ["https://developers.openai.com/codex/auth/ci-cd-auth", "https://developers.openai.com/codex/noninteractive#authenticate-in-ci"],
  ["https://developers.openai.com/codex/guides/slash-commands", "https://developers.openai.com/codex/cli/slash-commands"],
  ["https://developers.openai.com/codex/ide/cloud-tasks", "https://developers.openai.com/codex/ide/features#cloud-delegation"],
  ["https://developers.openai.com/codex/use-cases", "https://developers.openai.com/codex/workflows"]
]);

const knownAnchorAliases = new Map<string, ReadonlyMap<string, string>>([
  ["cli/slash-commands", new Map([
    ["#set-or-view-an-experimental-task-goal-with-goal", "#set-an-experimental-goal-with-goal"]
  ])],
  ["enterprise/admin-setup", new Map([
    ["#team-config", "#step-4-standardize-local-configuration-with-team-config"]
  ])]
]);

const knownNonDocumentationCodexPathnames = new Set([
  "/codex/codex-for-oss-terms"
]);

function resolveKnownPageAlias(absoluteHref: string): string {
  const normalized = normalizeCodexPageUrl(absoluteHref);
  return knownPageAliases.get(normalized.canonicalUrl) ?? absoluteHref;
}

function resolveKnownAnchorAlias(pageId: string, hash: string): string {
  if (hash.length === 0) {
    return "";
  }

  return knownAnchorAliases.get(pageId)?.get(hash) ?? hash;
}

function isKnownNonDocumentationCodexResource(absoluteHref: string): boolean {
  const url = new URL(absoluteHref);
  if (knownNonDocumentationCodexPathnames.has(url.pathname)) {
    return true;
  }

  return /\.[a-z0-9]+$/iu.test(url.pathname) && !url.pathname.endsWith(".md");
}
