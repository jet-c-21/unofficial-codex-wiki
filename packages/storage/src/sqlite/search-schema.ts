export const searchSchemaSql = `
CREATE TABLE doc_pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  local_markdown_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE doc_chunks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  title TEXT NOT NULL,
  heading_path TEXT NOT NULL,
  heading_path_json TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT NOT NULL,
  local_markdown_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  FOREIGN KEY (page_id) REFERENCES doc_pages(id)
);

CREATE VIRTUAL TABLE doc_chunks_fts USING fts5(
  title,
  heading_path,
  content,
  content='doc_chunks',
  content_rowid='rowid'
);
`;
