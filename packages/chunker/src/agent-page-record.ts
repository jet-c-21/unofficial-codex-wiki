import type { AgentDocPageRecord, ManifestPage } from "@unofficial-codex-wiki/core";
import { extractHeadingMatches } from "./heading-extractor.js";
import { extractMarkdownLinks } from "./link-extractor.js";

export function createAgentDocPageRecord(page: ManifestPage, markdownBody: string): AgentDocPageRecord {
  const record: AgentDocPageRecord = {
    recordType: "page",
    id: page.id,
    title: page.title,
    sourceUrl: page.sourceUrl,
    canonicalUrl: page.canonicalUrl,
    localMarkdownPath: page.localMarkdownPath,
    content: markdownBody,
    contentType: "markdown",
    contentHash: page.contentHash,
    fetchedAt: page.fetchedAt,
    headings: extractHeadingMatches(markdownBody).map((heading) => heading.path.join(" > ")),
    links: extractMarkdownLinks(markdownBody).map((link) => ({
      text: link.text,
      originalHref: link.originalHref,
      localHref: link.localHref,
      type: link.type
    }))
  };

  if (page.markdownSourceUrl !== undefined) {
    record.markdownSourceUrl = page.markdownSourceUrl;
  }

  return record;
}
