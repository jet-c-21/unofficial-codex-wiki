import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { AgentDocChunkRecord, AgentDocPageRecord } from "@unofficial-codex-wiki/core";
import { searchSchemaSql } from "@unofficial-codex-wiki/storage";

export type BuildSearchIndexInput = {
  sqlitePath: string;
  pages: readonly AgentDocPageRecord[];
  chunks: readonly AgentDocChunkRecord[];
};

export type SearchIndexBuildResult = {
  sqlitePath: string;
  pageCount: number;
  chunkCount: number;
};

export type SearchResult = {
  title: string;
  snippet: string;
  sourceUrl: string;
  localMarkdownPath: string;
  headingPath: string[];
  chunkId: string;
};

export type SearchOptions = {
  limit?: number;
};

export function buildSearchIndex(input: BuildSearchIndexInput): SearchIndexBuildResult {
  mkdirSync(path.dirname(input.sqlitePath), { recursive: true });
  if (existsSync(input.sqlitePath)) {
    rmSync(input.sqlitePath, { force: true });
  }

  const database = new Database(input.sqlitePath);
  try {
    database.pragma("foreign_keys = ON");
    database.exec(searchSchemaSql);

    const insertPage = database.prepare(`
      INSERT INTO doc_pages (
        id,
        title,
        source_url,
        canonical_url,
        local_markdown_path,
        content_hash,
        fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertChunk = database.prepare(`
      INSERT INTO doc_chunks (
        id,
        page_id,
        title,
        heading_path,
        heading_path_json,
        content,
        source_url,
        local_markdown_path,
        chunk_index,
        content_hash,
        fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRecords = database.transaction(() => {
      for (const page of input.pages) {
        insertPage.run(
          page.id,
          page.title,
          page.sourceUrl,
          page.canonicalUrl,
          page.localMarkdownPath,
          page.contentHash,
          page.fetchedAt
        );
      }

      for (const chunk of input.chunks) {
        insertChunk.run(
          chunk.id,
          chunk.pageId,
          chunk.title,
          chunk.headingPath.join(" > "),
          JSON.stringify(chunk.headingPath),
          chunk.content,
          chunk.sourceUrl,
          chunk.localMarkdownPath,
          chunk.chunkIndex,
          chunk.contentHash,
          chunk.fetchedAt
        );
      }

      database.exec(`
        INSERT INTO doc_chunks_fts(rowid, title, heading_path, content)
        SELECT rowid, title, heading_path, content FROM doc_chunks
      `);
    });

    insertRecords();
  } finally {
    database.close();
  }

  return {
    sqlitePath: input.sqlitePath,
    pageCount: input.pages.length,
    chunkCount: input.chunks.length
  };
}

export function searchIndex(sqlitePath: string, query: string, options: SearchOptions = {}): SearchResult[] {
  const ftsQuery = toFtsQuery(query);
  const limit = options.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Invalid search limit: ${limit}`);
  }

  const database = new Database(sqlitePath, {
    readonly: true,
    fileMustExist: true
  });

  try {
    const statement = database.prepare(`
      SELECT
        c.id AS chunkId,
        c.title AS title,
        snippet(doc_chunks_fts, 2, '[', ']', '...', 24) AS snippet,
        c.source_url AS sourceUrl,
        c.local_markdown_path AS localMarkdownPath,
        c.heading_path_json AS headingPathJson
      FROM doc_chunks_fts
      JOIN doc_chunks c ON c.rowid = doc_chunks_fts.rowid
      WHERE doc_chunks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    return statement.all(ftsQuery, limit).map((row) => {
      const typedRow = row as {
        chunkId: string;
        title: string;
        snippet: string;
        sourceUrl: string;
        localMarkdownPath: string;
        headingPathJson: string;
      };

      return {
        title: typedRow.title,
        snippet: typedRow.snippet,
        sourceUrl: typedRow.sourceUrl,
        localMarkdownPath: typedRow.localMarkdownPath,
        headingPath: JSON.parse(typedRow.headingPathJson) as string[],
        chunkId: typedRow.chunkId
      };
    });
  } finally {
    database.close();
  }
}

function toFtsQuery(query: string): string {
  const terms = query
    .trim()
    .split(/\s+/u)
    .filter((term) => term.length > 0);

  if (terms.length === 0) {
    throw new Error("Search query cannot be empty.");
  }

  return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" AND ");
}
