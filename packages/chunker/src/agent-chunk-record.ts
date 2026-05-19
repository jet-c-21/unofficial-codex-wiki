import type { AgentDocChunkRecord, DocChunk } from "@unofficial-codex-wiki/core";

export function toAgentDocChunkRecord(chunk: DocChunk): AgentDocChunkRecord {
  return {
    recordType: "chunk",
    id: chunk.id,
    pageId: chunk.pageId,
    title: chunk.title,
    ...(chunk.description === undefined ? {} : { description: chunk.description }),
    sourceUrl: chunk.sourceUrl,
    canonicalUrl: chunk.canonicalUrl,
    localMarkdownPath: chunk.localMarkdownPath,
    headingPath: chunk.headingPath,
    content: chunk.content,
    contentType: chunk.contentType,
    chunkIndex: chunk.chunkIndex,
    contentHash: chunk.contentHash,
    fetchedAt: chunk.fetchedAt
  };
}
