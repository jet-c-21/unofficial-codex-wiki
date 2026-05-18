import { joinPortablePath } from "@unofficial-codex-wiki/core";
import { normalizeCodexPageUrl } from "@unofficial-codex-wiki/sources";

export type ManifestPathMapEntry = {
  id: string;
  sourceUrl: string;
  canonicalUrl: string;
  markdownSourceUrl: string;
  localMarkdownPath: string;
  section?: string;
};

export type ManifestPathMap = {
  entries: ManifestPathMapEntry[];
  byCanonicalUrl: ReadonlyMap<string, ManifestPathMapEntry>;
  byMarkdownSourceUrl: ReadonlyMap<string, ManifestPathMapEntry>;
};

export function buildManifestPathMap(sourceUrls: readonly string[]): ManifestPathMap {
  const entriesById = new Map<string, ManifestPathMapEntry>();

  for (const sourceUrl of sourceUrls) {
    const normalized = normalizeCodexPageUrl(sourceUrl);
    if (entriesById.has(normalized.id)) {
      continue;
    }

    const entry: ManifestPathMapEntry = {
      id: normalized.id,
      sourceUrl: normalized.canonicalUrl,
      canonicalUrl: normalized.canonicalUrl,
      markdownSourceUrl: normalized.markdownSourceUrl,
      localMarkdownPath: toGeneratedMarkdownPath(normalized.id)
    };

    if (normalized.section !== undefined) {
      entry.section = normalized.section;
    }

    entriesById.set(normalized.id, entry);
  }

  const entries = [...entriesById.values()].sort((left, right) => left.id.localeCompare(right.id));
  const byCanonicalUrl = new Map<string, ManifestPathMapEntry>();
  const byMarkdownSourceUrl = new Map<string, ManifestPathMapEntry>();

  for (const entry of entries) {
    byCanonicalUrl.set(entry.canonicalUrl, entry);
    byMarkdownSourceUrl.set(entry.markdownSourceUrl, entry);
  }

  return {
    entries,
    byCanonicalUrl,
    byMarkdownSourceUrl
  };
}

export function resolveManifestPathEntry(pathMap: ManifestPathMap, sourceUrl: string): ManifestPathMapEntry | undefined {
  const normalized = normalizeCodexPageUrl(sourceUrl);
  return pathMap.byCanonicalUrl.get(normalized.canonicalUrl) ?? pathMap.byMarkdownSourceUrl.get(normalized.markdownSourceUrl);
}

export function toGeneratedMarkdownPath(id: string): string {
  const relativeId = id === "codex" ? "index" : id;
  return joinPortablePath("generated", "markdown", "codex", `${relativeId}.md`);
}
