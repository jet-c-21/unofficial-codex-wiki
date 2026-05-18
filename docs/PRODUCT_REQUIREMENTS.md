# Product Requirements Document: `unofficial-codex-wiki`

Status: refined, implementation-ready PRD  
Version: 1.1  
Last updated: 2026-05-18  
Repository name: `unofficial-codex-wiki`

---

## 0. Agent Quick Start

This PRD is the single source of truth for the first implementation of `unofficial-codex-wiki`.

The repository starts as an empty directory. The first Codex run must bootstrap project context and planning artifacts before writing implementation code.

Use this exact initial prompt in Codex:

```text
You are working in an empty repo named `unofficial-codex-wiki`.

Treat the Markdown PRD I provide as the single source of truth.

Do not implement the application yet.

Phase 0 only:
1. Save this PRD to `docs/PRODUCT_REQUIREMENTS.md`.
2. Create `AGENTS.md` from the "AGENTS.md Seed" section of the PRD.
3. Create `docs/IMPLEMENTATION_PLAN.md` with milestones, task order, and validation steps.
4. Create `docs/DECISIONS.md` and record every fixed product and architecture decision from the PRD.
5. Create `docs/OPEN_QUESTIONS.md` only if a blocking ambiguity remains after reading the PRD.
6. Propose the minimal v1 repository scaffold.
7. Do not install dependencies.
8. Do not write product implementation code.
9. Stop after Phase 0 and summarize the files created.

Rules:
- Do not guess missing product decisions.
- Do not implement excluded v1 features.
- Do not add MCP, embeddings, vector database, chatbot, public hosting, scheduled sync, AI summaries, or a local viewer in v1.
- If requirements conflict, follow the precedence rules in this PRD.
```

After the user approves Phase 0, Codex may start Milestone 1.

---

## 1. Executive Summary

`unofficial-codex-wiki` is a private, local-first TypeScript monorepo that mirrors official OpenAI Codex documentation for:

1. offline reading,
2. local CLI search,
3. AI-agent context ingestion,
4. snapshot comparison over time.

The project is not a public wiki. It must not publish copied OpenAI documentation publicly.

The v1 product is a deterministic local documentation pipeline:

```text
official Codex docs
-> URL discovery from /codex/llms.txt
-> Markdown-first page fetch
-> static HTML fallback only when required
-> normalized local Markdown
-> agent-friendly JSONL pages and chunks
-> SQLite FTS5 keyword search
-> local CLI read/search commands
-> validation report and snapshot diff
```

V1 does not create summaries, rewrite official docs, create a chatbot, use embeddings, expose an MCP server, run scheduled sync, or publish a public website.

---

## 2. Normative Language

The following terms are mandatory:

| Term | Meaning |
|---|---|
| MUST | Required for v1. |
| MUST NOT | Forbidden for v1. |
| SHOULD | Recommended default; changing it requires a recorded decision. |
| MAY | Optional only when it does not conflict with v1 scope. |

Agents must treat all `MUST` and `MUST NOT` statements as hard constraints.

---

## 3. Fixed Decisions

These decisions are already made. Agents must not reopen them unless the user explicitly changes the PRD.

| Area | Decision |
|---|---|
| Repository name | `unofficial-codex-wiki` |
| Product type | Private local documentation mirror and ingestion pipeline |
| Main language | TypeScript |
| Runtime | Node.js 22 or newer |
| Package manager | `pnpm` |
| Module system | ESM |
| Repo style | Domain-driven TypeScript monorepo |
| Monorepo runner | Turborepo |
| Supported OS targets | Ubuntu/Linux, Windows, and macOS |
| Primary source scope | `https://developers.openai.com/codex` and `https://developers.openai.com/codex/**` |
| Discovery source | `https://developers.openai.com/codex/llms.txt` |
| Primary page source | Markdown pages linked from `llms.txt`, normally `https://developers.openai.com/codex/*.md` |
| Optional coverage reference | `https://developers.openai.com/codex/llms-full.txt` |
| HTML crawling | Fallback only when Markdown fetch or validation fails |
| Playwright | Not required in v1 unless a documented sentinel proves static fetch cannot retrieve required article content |
| Output priority | Agent-ingestion-first, developer-readable-second |
| Search | SQLite FTS5 keyword search |
| Public publishing | Forbidden in v1 |
| Generated summaries | Forbidden in v1 |
| AI rewriting | Forbidden in v1 |
| Manual notes | Allowed only outside generated mirrored content |
| Local viewer | Forbidden in v1 |
| Local API server | Forbidden in v1 |
| MCP server | Forbidden in v1 |
| Codex SDK workflow | Forbidden in v1 |
| Codex Actions workflow | Forbidden in v1 |
| Semantic search | Forbidden in v1 |
| Vector database | Forbidden in v1 |
| Scheduled auto-sync | Forbidden in v1 |
| Default crawler behavior | Conservative, cache-first, slow-by-default |

---

## 4. Requirement Precedence

If requirements conflict, agents must apply this order:

1. Safety, legality, privacy, and private-use constraints.
2. V1 scope boundaries and explicit exclusions.
3. Source-of-truth and source-scope rules.
4. Data integrity and traceability requirements.
5. Crawler politeness and cache-first requirements.
6. Required output formats.
7. Suggested repository structure and implementation details.
8. Future-version ideas.

If a conflict remains after applying this order, stop and ask the user before implementing.

---

## 5. No-Guess Agent Contract

Agents working on this repository MUST:

- read `docs/PRODUCT_REQUIREMENTS.md` before product or architecture changes,
- follow this PRD over assumptions,
- record fixed decisions in `docs/DECISIONS.md`,
- keep implementation work aligned to the current milestone,
- ask only when a decision is both blocking and not answered by the PRD,
- avoid implementing future-scope features,
- run relevant validation before claiming completion.

Agents MUST NOT:

- infer hidden product goals,
- add convenience features outside v1 scope,
- replace fixed technology choices without user approval,
- crawl outside the approved Codex documentation scope,
- mix generated mirrored content with human-authored notes,
- claim work is complete without reporting validation status.

When uncertain:

| Situation | Required behavior |
|---|---|
| Requirement is explicit | Follow it. |
| Requirement is missing but not blocking | Choose the smallest conservative implementation and record the assumption. |
| Requirement is missing and blocking | Ask the user. |
| Requirement conflicts with another requirement | Apply precedence rules, then ask if still unresolved. |
| Dependency install fails | Stop, report exact failure, and ask before substituting. |
| Network fetch fails | Use cache if allowed; otherwise mark page failed with reason. |

---

## 6. Product Purpose

The product exists to help developers and coding agents use Codex documentation locally.

V1 must support these user outcomes:

1. A developer can mirror Codex documentation into local Markdown.
2. A developer can read local Markdown offline.
3. A developer can search local Codex documentation from the CLI.
4. An AI coding agent can ingest JSONL page and chunk records with source metadata.
5. The repository owner can compare snapshots and detect official documentation changes.
6. A developer can run the repository on Ubuntu/Linux, Windows, and macOS without OS-specific setup beyond Node.js 22+, `pnpm`, and normal native dependency prerequisites.

V1 must not pretend to be official OpenAI documentation. All generated outputs must clearly identify themselves as an unofficial private local mirror.

---

## 7. Legal, Safety, and Usage Boundary

This project is for private local or internal use only.

The repository MUST include this notice in `README.md`, generated metadata, and relevant docs:

```text
This is an unofficial private local mirror of selected OpenAI Codex documentation.
It is not affiliated with, endorsed by, or maintained by OpenAI.
It is intended for local/internal reading and AI-agent context ingestion only.
Do not publish copied OpenAI documentation generated by this project as a public website.
```

The crawler MUST:

- use conservative rate limits,
- prefer local cache,
- avoid repeated unnecessary requests,
- stay inside Codex documentation scope,
- avoid access-control bypass,
- avoid authenticated user cookies,
- avoid dashboards and private pages,
- avoid crawling external links,
- preserve source URLs and timestamps.

---

## 8. V1 Scope

### 8.1 V1 Goal

V1 is complete when:

```text
pnpm docs:sync
```

creates validated local outputs:

```text
data/latest/manifest.json
generated/markdown/codex/**
generated/agent/docs.pages.jsonl
generated/agent/docs.chunks.jsonl
generated/agent/docs.manifest.json
generated/search/docs.sqlite
```

and these commands work from local data:

```text
pnpm docs:search "query"
pnpm docs:read <page-or-slug>
pnpm docs:validate
```

### 8.2 Included in V1

V1 MUST include:

1. TypeScript monorepo setup.
2. Root `AGENTS.md`.
3. Product docs under `docs/`.
4. URL discovery from `/codex/llms.txt`.
5. Markdown-first page fetch from discovered `.md` links.
6. Cache-first and snapshot-based storage.
7. Conservative rate limit and retry policy.
8. Source scope validation.
9. Optional static HTML fallback using `undici` and `cheerio`.
10. Markdown normalization.
11. Front matter metadata insertion.
12. Local internal link rewriting.
13. Anchor preservation and validation.
14. Documentation asset mirroring only when required for offline reading.
15. JSONL page writer.
16. JSONL chunk writer.
17. SQLite FTS5 keyword search index.
18. Manifest generation.
19. Snapshot comparison by content hash.
20. CLI commands for discover, fetch, extract, transform, chunk, index, search, read, validate, and sync.
21. Unit tests for critical modules.
22. Validation report.
23. README with setup and usage instructions.

### 8.3 Excluded from V1

V1 MUST NOT implement:

- public website publishing,
- public deployment,
- Docusaurus,
- Nextra,
- full browser UI,
- local viewer,
- local API server,
- MCP server,
- Codex SDK workflow,
- Codex Action workflow,
- GitHub Action auto-sync,
- scheduled sync,
- automatic PR creation,
- embeddings,
- vector database,
- semantic search,
- RAG pipeline,
- chatbot,
- AI-generated summaries,
- AI-generated rewrites,
- aggressive crawler profile,
- fast crawler profile,
- crawling unrelated docs outside `/codex`,
- crawling external websites.

### 8.4 Future Versions

Future versions may be considered only after v1 is accepted.

V1.5 MAY add:

- local static viewer,
- local API,
- snapshot pruning,
- richer diff reports,
- better asset mirroring,
- optional scheduled sync after safe behavior is proven.

V2 MAY add:

- MCP server,
- semantic search,
- embeddings,
- vector database,
- AI-generated summary layer separated from mirrored source content,
- Codex review workflow,
- browser UI for localhost or a local network.

Future-version ideas must not be scaffolded in v1 unless the user explicitly approves them.

---

## 9. Source-of-Truth Policy

### 9.1 Official Source Scope

The v1 source scope is strictly:

```text
https://developers.openai.com/codex
https://developers.openai.com/codex/**
```

The only approved source host is:

```text
developers.openai.com
```

V1 MUST NOT crawl:

- unrelated OpenAI documentation areas,
- platform dashboard pages,
- login pages,
- authenticated pages,
- analytics URLs,
- API endpoints,
- external websites.

### 9.2 Discovery Source

The primary discovery document is:

```text
https://developers.openai.com/codex/llms.txt
```

The discovery step MUST parse this file and extract in-scope Codex documentation Markdown links.

### 9.3 Content Source Priority

Use this exact priority:

1. Direct Markdown pages linked from `/codex/llms.txt`.
2. Optional `/codex/llms-full.txt` as a coverage/reference check only.
3. Static HTML fetch with `undici` plus `cheerio` only for pages where Markdown fetch is missing, failed, or fails sentinel validation.
4. Playwright only when a documented sentinel proves static Markdown and static HTML cannot retrieve required article content.

The default pipeline is Markdown-first, not HTML-first.

### 9.4 Coverage Meaning

The phrase "generated wiki content must be greater than or equal to the website version" means:

```text
Every in-scope Codex documentation page discovered from llms.txt must produce a local output record unless it is explicitly marked failed with a clear reason in the manifest.
```

It does not mean the project should:

- invent additional content,
- summarize pages,
- rewrite official docs,
- crawl outside Codex documentation scope.

### 9.5 No AI-Generated Content

V1 MUST NOT generate summaries, explanations, rewrites, paraphrases, opinions, tutorials, or commentary derived from official docs.

Generated content MAY include:

- copied Markdown content from official source pages for private local use,
- normalized Markdown formatting,
- front matter metadata,
- link rewrites,
- extracted plain text,
- JSONL records,
- chunks made from original content,
- search index records,
- manifests,
- validation metadata.

Generated content MUST NOT include:

- AI-authored summaries,
- AI-authored explanations,
- AI-authored tutorials,
- AI-authored opinions,
- merged pages that alter meaning,
- rewritten official docs.

---

## 10. User Stories

### 10.1 Offline Reading

As a developer, I want to run `pnpm docs:sync` once and then read generated Markdown files offline.

Acceptance criteria:

- Markdown files exist under `generated/markdown/codex/`.
- Internal Codex documentation links point to local Markdown files.
- External links remain unchanged.
- Every Markdown file has source metadata.

### 10.2 Agent Ingestion

As an AI coding agent, I want JSONL pages and chunks with source metadata.

Acceptance criteria:

- `generated/agent/docs.pages.jsonl` exists.
- `generated/agent/docs.chunks.jsonl` exists.
- Each record has source URL, canonical URL, local Markdown path, content hash, and fetched timestamp.
- Chunks preserve heading paths.
- Chunks do not contain AI-generated summaries.

### 10.3 CLI Search

As a developer, I want to search the local mirror from the CLI.

Acceptance criteria:

- `pnpm docs:search "query"` returns local results.
- Results include title, snippet, source URL, local Markdown path, heading path when available, and chunk ID when available.
- Search uses SQLite FTS5, not embeddings.

### 10.4 CLI Read

As a developer, I want to read a page from the CLI.

Acceptance criteria:

- `pnpm docs:read <slug>` prints a local Markdown page or relevant section.
- Missing pages fail clearly with a non-zero exit code.

### 10.5 Snapshot Traceability

As the repository owner, I want snapshots and content hashes.

Acceptance criteria:

- Each sync creates a timestamped snapshot.
- `data/latest` points to or copies the most recent successful snapshot.
- Manifest page status is `new`, `changed`, `unchanged`, `removed`, or `failed`.
- Content hashes are stable for unchanged content.

---

## 11. Architecture Overview

### 11.1 Monorepo Layout

Use a domain-driven TypeScript monorepo:

```text
unofficial-codex-wiki/
  apps/
    cli/

  packages/
    core/
    config/
    sources/
    crawler/
    extractor/
    transformer/
    chunker/
    storage/
    indexer/
    validator/
    pipeline/
    logger/
    testing/

  data/
    snapshots/
    latest/

  generated/
    markdown/
    agent/
    search/

  docs/
    architecture/
    decisions/
    operations/

  configs/
    eslint/
    typescript/
    vitest/
    prettier/

  scripts/

  .github/
    workflows/

  .gitignore
  .npmrc
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  turbo.json
  tsconfig.json
  README.md
  AGENTS.md
```

### 11.2 V1 App

Only one app is required in v1:

| App | Status | Purpose |
|---|---|---|
| `apps/cli` | Required | Main developer interface for sync, search, read, and validation. |

Do not create these apps in v1:

| App | Earliest version | Reason |
|---|---|---|
| `apps/local-api` | V1.5 or V2 | Not needed for CLI-first v1. |
| `apps/local-viewer` | V1.5 or V2 | Browser UI is out of v1 scope. |
| `apps/mcp-server` | V2 | MCP is explicitly out of v1 scope. |

### 11.3 Package Responsibilities

| Package | Responsibility |
|---|---|
| `core` | Domain types, invariants, hashes, slugs, and utility helpers. |
| `config` | Centralized config loading and validation. |
| `sources` | Codex source adapter, `llms.txt` parser, URL rules, taxonomy mapping. |
| `crawler` | HTTP fetcher, cache, rate limiting, retry policy, scope policy, asset policy. |
| `extractor` | Static HTML fallback extraction only. |
| `transformer` | Markdown normalization, front matter, local links, JSONL writing helpers. |
| `chunker` | Heading-aware and token-aware chunking for agent ingestion. |
| `storage` | Snapshot store, latest store, manifest store, asset store, SQLite store. |
| `indexer` | SQLite FTS5 index, search query parsing, manifest builder, snapshot differ. |
| `validator` | Output, link, metadata, asset, crawler-policy, and coverage validation. |
| `pipeline` | Orchestrates discover, fetch, transform, chunk, index, validate, diff. |
| `logger` | Shared structured logging. |
| `testing` | Fixtures, factories, mock fetcher, temporary directory helpers. |

---

## 12. Technical Stack

Use these defaults unless the user explicitly changes them:

| Area | Decision |
|---|---|
| Language | TypeScript |
| Runtime | Node.js 22+ |
| Module system | ESM |
| Package manager | `pnpm` |
| Monorepo runner | Turborepo |
| CLI framework | `commander` |
| HTTP client | `undici` |
| HTML parsing fallback | `cheerio` |
| HTML-to-Markdown fallback | `turndown` |
| Markdown processing | `unified`, `remark-parse`, `remark-stringify` |
| Front matter | `gray-matter` |
| Validation schemas | `zod` |
| Logging | `pino` |
| SQLite | `better-sqlite3` with FTS5 |
| Testing | `vitest` |
| Formatting | Prettier |
| Linting | ESLint |

If a dependency fails to install on Ubuntu 22.04, stop and report the exact failure before substituting a dependency.

V1 MUST also work on Windows and macOS. If a dependency fails only on Windows or macOS, stop and report the exact failure before substituting it.

Cross-platform implementation rules:

- use Node.js path utilities instead of hardcoded `/` or `\` filesystem separators,
- keep generated manifest and JSONL paths project-relative and normalized with forward slashes for portability,
- avoid shell scripts that require Bash-only behavior for required workflows,
- keep root `package.json` scripts runnable through `pnpm` on Ubuntu/Linux, Windows, and macOS,
- avoid OS-specific commands in required scripts unless wrapped by TypeScript or Node.js helpers,
- document any native dependency prerequisites for `better-sqlite3` on each supported OS,
- ensure tests use temporary directories and path assertions that pass on all supported OS targets.

---

## 13. Discovery Requirements

### 13.1 Required Command

```text
pnpm docs:discover
```

Expected behavior:

1. Fetch `/codex/llms.txt` using the configured crawler policy.
2. Parse Markdown links.
3. Keep only in-scope URLs.
4. Normalize URLs.
5. Deduplicate URLs.
6. Write discovery output to `data/latest/discovery/openai-codex.urls.json`.

Output shape:

```json
{
  "source": "https://developers.openai.com/codex/llms.txt",
  "discoveredAt": "2026-05-18T00:00:00+08:00",
  "pageCount": 0,
  "urls": []
}
```

### 13.2 URL Normalization

The source adapter MUST normalize all of these into one canonical page identity:

```text
https://developers.openai.com/codex/cli.md
https://developers.openai.com/codex/cli
/codex/cli.md
/codex/cli
```

Local output identity MUST NOT depend on whether the source URL ended with `.md`.

### 13.3 URL Scope

Allowed page URLs:

```text
https://developers.openai.com/codex
https://developers.openai.com/codex/**
https://developers.openai.com/codex/*.md
https://developers.openai.com/codex/**/*.md
```

Allowed discovery/support URLs:

```text
https://developers.openai.com/codex/llms.txt
https://developers.openai.com/codex/llms-full.txt
```

Disallowed:

```text
https://platform.openai.com/**
https://openai.com/**
https://developers.openai.com/api/**
https://developers.openai.com/chatgpt/**
any external host
any login/dashboard/private/authenticated page
```

External links may be recorded as metadata. They MUST NOT be fetched in v1.

---

## 14. Fetching and Crawler Policy

### 14.1 Default Safe Policy

Use this safe, cache-first, slow-by-default policy:

```ts
export const safeCrawlerPolicy = {
  profile: "safe",
  userAgent: "unofficial-codex-wiki/0.1 (+private local documentation mirror)",
  allowedHosts: ["developers.openai.com"],
  allowedPathPrefixes: ["/codex"],
  allowNetworkRequests: true,
  cacheMode: "prefer-cache",
  crawlExternalLinks: false,
  crawlExternalAssets: false,
  failOnOutOfScopeUrl: true,

  maxConcurrentPageRequestsPerHost: 1,
  maxConcurrentAssetRequestsPerHost: 2,
  minDelayMsBetweenPageRequestsPerHost: 5_000,
  minDelayMsBetweenAssetRequestsPerHost: 2_000,
  maxRequestsPerMinutePerHost: 10,
  maxTotalRequestsPerRun: 300,

  requestTimeoutMs: 30_000,
  maxRetries: 2,
  retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
  initialRetryDelayMs: 5_000,
  maxRetryDelayMs: 60_000,
  pauseOn429WithoutRetryAfterMs: 10 * 60 * 1000,
  respectRetryAfterHeader: true,
  useJitter: true
} as const;
```

### 14.2 Policy Profiles

V1 supports only:

| Profile | Network | Purpose |
|---|---|---|
| `offline` | No | Use existing local snapshots only. |
| `safe` | Yes | Default conservative fetching. |
| `balanced` | Yes | Slightly faster, only when explicitly selected. |

Do not add `fast`, `aggressive`, or similar profiles in v1.

### 14.3 Cache Modes

| Mode | Behavior |
|---|---|
| `prefer-cache` | Use local cache when available; request network only when needed. |
| `refresh` | Revalidate known pages but use cache if network fails. |
| `force` | Ignore cache and intentionally refetch. |
| `offline` | Make zero network requests. |

Default mode is `prefer-cache`.

### 14.4 Offline Mode

When using `--offline` or `--profile offline`:

- make zero HTTP requests,
- read from `data/latest` or selected snapshot,
- fail clearly if required local files are missing,
- allow transform, chunk, index, validate, search, and read from existing local data.

Offline behavior MUST be enforced in code and covered by tests.

### 14.5 Retry Rules

Retry only safe `GET` requests.

Retry when:

```text
network error
timeout
HTTP 408
HTTP 425
HTTP 429
HTTP 500
HTTP 502
HTTP 503
HTTP 504
```

Do not retry when:

```text
HTTP 400
HTTP 401
HTTP 403
HTTP 404
HTTP 410
unsupported content type
out-of-scope URL
```

If `Retry-After` exists, respect it. If `429` occurs without `Retry-After`, pause the host queue for 10 minutes.

---

## 15. Pipeline Requirements

### 15.1 Required Pipeline Order

```text
1. discover
2. build-manifest-path-map
3. fetch-markdown
4. fetch-html-fallback-for-failed-pages
5. extract-html-fallback-content
6. normalize-markdown
7. rewrite-links
8. mirror-required-assets
9. write-markdown
10. write-jsonl-pages
11. chunk-content
12. write-jsonl-chunks
13. build-sqlite-fts-index
14. validate
15. diff-snapshot
```

### 15.2 Sync Command

```text
pnpm docs:sync
```

`docs:sync` MUST run:

```text
discover -> fetch -> transform -> chunk -> index -> validate -> diff
```

The command MUST exit non-zero if validation fails.

### 15.3 Partial Commands

Required root scripts:

```text
pnpm docs:discover
pnpm docs:fetch
pnpm docs:extract
pnpm docs:transform
pnpm docs:chunk
pnpm docs:index
pnpm docs:validate
pnpm docs:search
pnpm docs:read
pnpm docs:sync
```

All root scripts SHOULD delegate to `apps/cli`.

---

## 16. Data Model Requirements

### 16.1 Core Domain Types

Define these domain types in `packages/core`:

```ts
export type SourceUrl = string;
export type LocalPath = string;
export type IsoDateTime = string;
export type Sha256Hash = `sha256:${string}`;

export type DocPage = {
  id: string;
  title: string;
  sourceUrl: SourceUrl;
  canonicalUrl: SourceUrl;
  markdownSourceUrl?: SourceUrl;
  localMarkdownPath: LocalPath;
  localRawMarkdownPath?: LocalPath;
  localRawHtmlPath?: LocalPath;
  section?: string;
  contentHash: Sha256Hash;
  fetchedAt: IsoDateTime;
  headings: DocHeading[];
  links: DocLink[];
  assets: DocAsset[];
};

export type DocHeading = {
  depth: number;
  text: string;
  slug: string;
  path: string[];
};

export type DocLink = {
  text: string;
  originalHref: string;
  localHref: string | null;
  type: "internal" | "external" | "anchor" | "asset";
  resolved: boolean;
};

export type DocAsset = {
  originalUrl: string;
  localPath: string;
  contentHash: Sha256Hash;
  mediaType?: string;
};

export type DocChunk = {
  id: string;
  pageId: string;
  title: string;
  sourceUrl: SourceUrl;
  canonicalUrl: SourceUrl;
  localMarkdownPath: LocalPath;
  headingPath: string[];
  content: string;
  contentType: "markdown";
  chunkIndex: number;
  contentHash: Sha256Hash;
  fetchedAt: IsoDateTime;
};
```

### 16.2 Manifest Page Type

Each discovered page MUST appear in the manifest:

```ts
export type ManifestPage = {
  id: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  markdownSourceUrl?: string;
  localMarkdownPath: string;
  localRawMarkdownPath?: string;
  localRawHtmlPath?: string;
  localJsonlChunkIds: string[];
  section?: string;
  contentHash: string;
  fetchedAt: string;
  status: "new" | "changed" | "unchanged" | "removed" | "failed";
  failureReason?: string;
};
```

### 16.3 Agent JSONL Page Record

Each JSONL page record MUST include:

```ts
export type AgentDocPageRecord = {
  recordType: "page";
  id: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  markdownSourceUrl?: string;
  localMarkdownPath: string;
  content: string;
  contentType: "markdown";
  contentHash: string;
  fetchedAt: string;
  headings: string[];
  links: Array<{
    text: string;
    originalHref: string;
    localHref: string | null;
    type: "internal" | "external" | "anchor" | "asset";
  }>;
};
```

### 16.4 Agent JSONL Chunk Record

Each JSONL chunk record MUST include:

```ts
export type AgentDocChunkRecord = {
  recordType: "chunk";
  id: string;
  pageId: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  localMarkdownPath: string;
  headingPath: string[];
  content: string;
  contentType: "markdown";
  chunkIndex: number;
  contentHash: string;
  fetchedAt: string;
};
```

---

## 17. Output Layout

### 17.1 Data Snapshots

After sync, data snapshots MUST use this layout:

```text
data/
  snapshots/
    <timestamp>/
      discovery/
        openai-codex.urls.json
      raw-markdown/
      raw-html/
      extracted/
      assets/
      metadata/
      manifest.json
      diff.json
      validation-report.json

  latest/
    discovery/
    raw-markdown/
    raw-html/
    extracted/
    assets/
    manifest.json
    diff.json
    validation-report.json
```

### 17.2 Generated Outputs

Generated outputs MUST use this layout:

```text
generated/
  markdown/
    codex/
      ...

  agent/
    docs.pages.jsonl
    docs.chunks.jsonl
    docs.manifest.json

  search/
    docs.sqlite
```

### 17.3 Generated vs Manual Separation

Generated content MUST live under:

```text
data/
generated/
```

Human-authored project documentation MUST live under:

```text
docs/
README.md
AGENTS.md
```

Manual notes about Codex concepts MUST NOT be mixed into generated mirrored files.

If manual notes are added later, use one of:

```text
docs/manual-notes/
notes/
```

and clearly label them as unofficial human-authored notes.

---

## 18. Markdown Output Requirements

Every generated Markdown page MUST include front matter.

Minimum front matter:

```yaml
---
title: "Codex CLI"
source_url: "https://developers.openai.com/codex/cli"
canonical_url: "https://developers.openai.com/codex/cli"
markdown_source_url: "https://developers.openai.com/codex/cli.md"
local_path: "generated/markdown/codex/cli.md"
section: "cli"
fetched_at: "2026-05-18T00:00:00+08:00"
content_hash: "sha256:..."
generated_by: "unofficial-codex-wiki"
unofficial_local_mirror: true
---
```

Markdown body requirements:

- preserve source page title,
- preserve headings,
- preserve code blocks,
- preserve tables when possible,
- preserve internal links after local rewriting,
- preserve external links as original URLs,
- do not add summaries,
- do not add commentary,
- do not silently drop content.

---

## 19. Link and Asset Policy

### 19.1 Link Rewriting

Internal Codex documentation links MUST point to local generated Markdown files.

External links MUST remain original web URLs.

Every generated page MUST preserve original source URLs and canonical URLs in metadata.

### 19.2 Internal Link Rules

Links pointing to these locations are internal:

```text
https://developers.openai.com/codex
https://developers.openai.com/codex/**
/codex
/codex/**
```

Internal links MUST be rewritten to local relative Markdown paths.

The exact local path MUST come from the manifest. Agents MUST NOT hardcode taxonomy paths.

Example manifest entry:

```json
{
  "sourceUrl": "https://developers.openai.com/codex/cli",
  "markdownSourceUrl": "https://developers.openai.com/codex/cli.md",
  "localMarkdownPath": "generated/markdown/codex/cli.md"
}
```

When rewriting from one generated file to another, compute the correct relative path from the current file to the target file.

### 19.3 External Link Rules

Links outside Codex documentation scope MUST remain unchanged.

Examples:

```text
https://openai.com/policies/terms-of-use
https://github.com/openai/...
https://platform.openai.com/...
```

External links SHOULD be recorded in metadata. They MUST NOT be crawled in v1.

### 19.4 Anchor Rules

Same-page anchors remain same-page anchors:

```text
#configuration
```

Cross-page anchors MUST be rewritten to local page path plus anchor:

```text
/codex/cli#configuration
-> ../cli.md#configuration
```

If a heading does not already have a stable ID, generate a slug from heading text using one central slug function.

The validator MUST check that internal anchors resolve to a heading in generated Markdown.

### 19.5 Asset Mirroring

Mirror only assets that are part of main documentation article content.

Allowed in v1:

- images inside documentation articles,
- diagrams inside documentation articles,
- screenshots inside documentation articles,
- other article-level media needed to understand the page.

Do not mirror:

- navbar icons,
- footer assets,
- logo assets unless part of article content,
- CSS files,
- JavaScript files,
- analytics scripts,
- tracking pixels,
- fonts,
- search UI assets,
- decorative layout assets.

Use content-addressed filenames when possible.

Example:

```text
Original:
https://developers.openai.com/assets/codex/example.png

Local:
generated/assets/codex/example.sha256-abcd1234.png
```

Generated Markdown SHOULD point to local asset paths.

---

## 20. Chunking Requirements

V1 chunks are for agent ingestion, not semantic search.

Chunking MUST:

- preserve original content,
- chunk by heading boundaries where possible,
- include heading path in each chunk,
- avoid splitting code blocks,
- avoid empty chunks,
- avoid summaries,
- avoid rewrites,
- include source metadata in each chunk.

Default strategy:

```text
heading-aware chunking first;
if a section is too large, split by token/character budget while preserving code blocks.
```

Default limits:

```text
targetChunkChars: 4,000
maxChunkChars: 8,000
minChunkChars: 200
```

If one code block exceeds `maxChunkChars`, keep it intact and mark the chunk as oversized.

---

## 21. SQLite FTS5 Search

V1 search MUST use SQLite FTS5.

Required database path:

```text
generated/search/docs.sqlite
```

Minimum schema:

```sql
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
```

If using `better-sqlite3`, implement migrations in:

```text
packages/storage/src/sqlite/migrations/
```

Search results MUST include:

- title,
- matching snippet,
- source URL,
- local Markdown path,
- heading path when available,
- chunk ID when available.

V1 search MUST NOT use embeddings or semantic search.

---

## 22. CLI Requirements

### 22.1 CLI Package

CLI app path:

```text
apps/cli
```

CLI executable name:

```text
codex-wiki
```

Root scripts MUST call this CLI.

### 22.2 Required Commands

```text
codex-wiki discover
codex-wiki fetch
codex-wiki extract
codex-wiki transform
codex-wiki chunk
codex-wiki index
codex-wiki validate
codex-wiki search <query>
codex-wiki read <page-or-slug>
codex-wiki sync
```

Root script aliases:

```json
{
  "docs:discover": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki discover",
  "docs:fetch": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki fetch",
  "docs:extract": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki extract",
  "docs:transform": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki transform",
  "docs:chunk": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki chunk",
  "docs:index": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki index",
  "docs:validate": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki validate",
  "docs:search": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki search",
  "docs:read": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki read",
  "docs:sync": "pnpm --filter @unofficial-codex-wiki/cli codex-wiki sync"
}
```

If exact `pnpm --filter` syntax needs adjustment after scaffolding, update `package.json` and record the decision in `docs/DECISIONS.md`.

### 22.3 CLI Flags

Support these flags where relevant:

```text
--profile offline|safe|balanced
--cache-mode prefer-cache|refresh|force|offline
--offline
--force
--snapshot <timestamp>
--limit <number>
--json
--verbose
```

### 22.4 Command Behavior

| Command | Behavior |
|---|---|
| `discover` | Fetch and parse `/codex/llms.txt`; write discovered URLs. |
| `fetch` | Fetch Markdown pages and required assets with safe crawler policy. |
| `extract` | Extract fallback HTML pages only when needed. |
| `transform` | Normalize Markdown, add metadata, rewrite links, mirror assets. |
| `chunk` | Produce agent-friendly chunks. |
| `index` | Build SQLite FTS5 database. |
| `validate` | Validate coverage, metadata, links, anchors, assets, policy, outputs. |
| `search` | Query local SQLite FTS5 database. |
| `read` | Print local Markdown page or section. |
| `sync` | Run the full pipeline and fail if validation fails. |

Commands MUST fail with clear messages and non-zero exit codes when required input data is missing.

---

## 23. Validation Requirements

Validation MUST run after `docs:sync` and on demand through:

```text
pnpm docs:validate
```

### 23.1 Coverage

Validator MUST check:

- every URL discovered from `/codex/llms.txt` appears in the manifest,
- every non-failed manifest page has a generated Markdown file,
- every non-failed manifest page has a JSONL page record,
- every non-failed manifest page has at least one chunk unless empty for a documented reason.

### 23.2 Metadata

Every generated Markdown page MUST have:

- `title`,
- `source_url`,
- `canonical_url`,
- `local_path`,
- `fetched_at`,
- `content_hash`,
- `unofficial_local_mirror: true`.

Every JSONL record MUST have:

- source URL,
- canonical URL,
- local Markdown path,
- content hash,
- fetched timestamp.

### 23.3 Links and Anchors

Validator MUST check:

- every internal Codex docs link resolves to a local mirrored page,
- every rewritten Markdown link points to an existing local file,
- every internal anchor points to an existing heading slug,
- external links remain original URLs,
- external links are not crawled.

### 23.4 Assets

Validator MUST check:

- every mirrored documentation asset exists on disk,
- no global site chrome assets are mirrored by mistake,
- no CSS, JS, analytics, tracking pixels, or fonts are mirrored in v1.

### 23.5 Content Integrity

Validator MUST check:

- no generated page is empty unless marked failed with a reason,
- code blocks are preserved,
- headings are preserved,
- no AI summaries are inserted,
- no AI rewrites are inserted.

### 23.6 Crawler Policy

Validator MUST check:

- default crawler profile is `safe`,
- default page concurrency is not higher than 1,
- default page delay is at least 5 seconds,
- default max requests per minute is not higher than 10,
- default retry count is not higher than 2,
- offline mode makes zero network requests,
- out-of-scope URLs are not fetched.

### 23.7 Search

Validator MUST check:

- `generated/search/docs.sqlite` exists after `docs:index`,
- `docs:search` returns local results for a known query,
- search result fields include title, snippet, source URL, and local path.

---

## 24. Acceptance Criteria

V1 is accepted only when all relevant criteria pass.

### 24.1 Setup Acceptance

- `pnpm install` succeeds.
- `pnpm test` succeeds.
- `pnpm lint` succeeds if linting is configured.
- `pnpm typecheck` succeeds.
- Required setup, test, typecheck, lint, and CLI scripts work on Ubuntu/Linux, Windows, and macOS.

### 24.2 Pipeline Acceptance

- `pnpm docs:discover` creates discovery output.
- `pnpm docs:fetch` uses safe profile by default.
- `pnpm docs:fetch --offline` makes zero network requests.
- `pnpm docs:sync` creates full local mirror output.
- `pnpm docs:validate` passes.

### 24.3 Output Acceptance

- `generated/markdown/codex/` contains local Markdown pages.
- `generated/agent/docs.pages.jsonl` exists.
- `generated/agent/docs.chunks.jsonl` exists.
- `generated/agent/docs.manifest.json` exists.
- `generated/search/docs.sqlite` exists.
- `data/latest/manifest.json` exists.
- Internal links point to local files.
- External links remain original URLs.
- Required documentation assets are available locally.

### 24.4 CLI Acceptance

- `pnpm docs:search "codex"` returns local results.
- `pnpm docs:read <known-page>` prints local Markdown.
- Commands fail clearly when data is missing.

### 24.5 Scope Acceptance

- No embeddings are implemented.
- No vector database is implemented.
- No chatbot is implemented.
- No MCP server is implemented.
- No local viewer is implemented.
- No public publishing is implemented.
- No scheduled auto-sync is implemented.
- No aggressive crawler profile is implemented.
- No AI-generated summaries are implemented.

### 24.6 Cross-Platform Acceptance

- CI runs on Ubuntu/Linux, Windows, and macOS.
- Path handling works on all supported OS targets.
- Required CLI commands run through `pnpm` without Bash-only assumptions.
- Generated metadata uses portable project-relative paths.
- SQLite setup and FTS5 search work on all supported OS targets.
- Any OS-specific prerequisite is documented in `README.md`.

---

## 25. Implementation Milestones

### Phase 0 - Agent Customization and Planning

Goal: bootstrap context and planning artifacts before product code.

Required outputs:

```text
AGENTS.md
docs/PRODUCT_REQUIREMENTS.md
docs/IMPLEMENTATION_PLAN.md
docs/DECISIONS.md
docs/OPEN_QUESTIONS.md only if needed
README.md skeleton
```

Phase 0 MUST stop after these files are created.

### Milestone 1 - Monorepo Scaffold and Domain Types

Implement:

- pnpm workspace,
- Turborepo config,
- TypeScript config,
- package skeletons,
- CLI skeleton,
- core domain types,
- cross-platform path utilities and script conventions,
- shared logger,
- config schema basics,
- test setup.

Validation:

```text
pnpm install
pnpm typecheck
pnpm test
```

The same validation must pass on Ubuntu/Linux, Windows, and macOS before v1 is accepted.

### Milestone 2 - Discovery and Safe Fetching

Implement:

- `llms.txt` discovery,
- URL scope validation,
- Markdown page fetcher,
- cache-first storage,
- safe crawler policy,
- retry behavior,
- offline mode.

Validation:

- discovery output exists,
- fetch output exists,
- offline mode makes zero network requests,
- out-of-scope URLs are rejected.

### Milestone 3 - Markdown Generation and Link Rewriting

Implement:

- Markdown normalization,
- front matter builder,
- manifest path map,
- internal link rewriting,
- anchor preservation,
- external link preservation,
- asset policy.

Validation:

- generated Markdown pages exist,
- internal links resolve,
- external links unchanged,
- metadata present.

### Milestone 4 - JSONL Chunks and Search

Implement:

- JSONL page writer,
- heading-aware chunker,
- JSONL chunk writer,
- SQLite schema,
- FTS5 indexer,
- search command,
- read command.

Validation:

- JSONL files exist,
- SQLite file exists,
- search returns results,
- read prints pages.

### Milestone 5 - Validation, Snapshots, and Docs

Implement:

- full validator,
- validation report,
- snapshot diff,
- README usage docs,
- operations docs.

Validation:

- `pnpm docs:sync` passes,
- `pnpm docs:validate` passes,
- acceptance criteria are met.

---

## 26. Testing Requirements

V1 MUST include unit tests for critical logic.

Required tests:

| Area | Required tests |
|---|---|
| URL scope | Accepts `/codex/**`; rejects external and unrelated URLs. |
| `llms.txt` parser | Extracts Markdown links and deduplicates URLs. |
| Cache mode | Offline mode makes zero network calls. |
| Retry policy | Retries only allowed status codes and respects retry limit. |
| Link rewriting | Internal links become local paths; external links are unchanged. |
| Anchor validation | Valid anchors pass; missing anchors fail. |
| Chunker | Preserves code blocks and heading paths. |
| Manifest | Every discovered page appears in manifest. |
| Validator | Catches missing metadata, missing files, bad links. |
| Search | Known test chunk is searchable through FTS5. |
| Cross-platform paths | Path helpers produce portable project-relative paths on Ubuntu/Linux, Windows, and macOS path examples. |
| CLI scripts | Required root scripts avoid Bash-only behavior and run through `pnpm`. |

Tests MUST avoid real network calls unless explicitly marked integration tests.

---

## 27. Logging Requirements

Use structured logging.

Log these events:

- selected crawler profile,
- final resolved crawler config,
- cache hit,
- cache miss,
- network request started,
- network request completed,
- retry scheduled,
- `Retry-After` respected,
- 429 pause started,
- out-of-scope URL skipped,
- external link recorded but not fetched,
- max requests per run reached,
- offline mode enabled,
- validation failure,
- sync summary.

Do not log:

- full response bodies,
- private machine paths beyond project-relative paths when avoidable,
- credentials,
- cookies,
- environment secrets.

---

## 28. Configuration Requirements

All crawler and path configuration MUST be centralized.

Required files:

```text
packages/config/src/crawler/crawler-policy.ts
packages/config/src/crawler/crawler-policy.schema.ts
packages/config/src/crawler/crawler-policy.presets.ts
packages/config/src/crawler/crawler-policy-loader.ts
packages/config/src/paths/paths-config.ts
packages/config/src/source/source-config.ts
packages/config/src/env.ts
```

Configuration override order:

```text
1. CLI flags
2. environment variables
3. project config file
4. built-in default policy
```

Supported environment variables:

```text
CODEX_KB_CRAWLER_PROFILE=safe
CODEX_KB_MAX_PAGE_CONCURRENCY=1
CODEX_KB_MAX_ASSET_CONCURRENCY=2
CODEX_KB_PAGE_DELAY_MS=5000
CODEX_KB_ASSET_DELAY_MS=2000
CODEX_KB_MAX_REQUESTS_PER_MINUTE=10
CODEX_KB_MAX_TOTAL_REQUESTS_PER_RUN=300
CODEX_KB_MAX_RETRIES=2
CODEX_KB_REQUEST_TIMEOUT_MS=30000
CODEX_KB_CACHE_MODE=prefer-cache
```

---

## 29. Suggested V1 Repository Tree

This is the target v1 structure. Do not create future apps in v1 unless the user explicitly approves.

```text
unofficial-codex-wiki/
  apps/
    cli/
      src/
        commands/
          discover.command.ts
          fetch.command.ts
          extract.command.ts
          transform.command.ts
          chunk.command.ts
          index.command.ts
          search.command.ts
          read.command.ts
          validate.command.ts
          sync.command.ts
        cli.ts
        main.ts
      package.json
      tsconfig.json

  packages/
    core/
      src/
        domain/
          doc-page.ts
          doc-section.ts
          doc-link.ts
          doc-asset.ts
          doc-snapshot.ts
          doc-chunk.ts
          content-hash.ts
        errors/
          app-error.ts
          invariant-error.ts
        utils/
          assert.ts
          hash.ts
          slug.ts
          time.ts
        index.ts
      package.json
      tsconfig.json

    config/
      src/
        crawler/
          crawler-policy.ts
          crawler-policy.schema.ts
          crawler-policy.presets.ts
          crawler-policy-loader.ts
        paths/
          paths-config.ts
        source/
          source-config.ts
        env.ts
        index.ts
      package.json
      tsconfig.json

    sources/
      src/
        openai-codex/
          codex-source.adapter.ts
          codex-llms-parser.ts
          codex-url-discovery.ts
          codex-url-rules.ts
          codex-taxonomy.ts
        source-adapter.interface.ts
        index.ts
      package.json
      tsconfig.json

    crawler/
      src/
        fetcher/
          http-fetcher.ts
          fetch-result.ts
        cache/
          http-cache.ts
        rate-limit/
          request-queue.ts
          host-rate-limiter.ts
        retry/
          retry-policy.ts
        scope/
          url-scope.ts
        assets/
          asset-policy.ts
        index.ts
      package.json
      tsconfig.json

    extractor/
      src/
        html/
          main-content-extractor.ts
          metadata-extractor.ts
          heading-extractor.ts
          link-extractor.ts
          code-block-extractor.ts
          asset-extractor.ts
        cleanup/
          remove-site-chrome.ts
          normalize-dom.ts
        index.ts
      package.json
      tsconfig.json

    transformer/
      src/
        markdown/
          markdown-normalizer.ts
          frontmatter-builder.ts
          html-to-markdown.ts
        jsonl/
          doc-page-jsonl-writer.ts
          doc-chunk-jsonl-writer.ts
        links/
          local-link-rewriter.ts
          canonical-link-preserver.ts
        index.ts
      package.json
      tsconfig.json

    chunker/
      src/
        strategies/
          heading-aware-chunker.ts
          token-aware-chunker.ts
        chunk-metadata.ts
        chunker.ts
        index.ts
      package.json
      tsconfig.json

    storage/
      src/
        filesystem/
          snapshot-store.ts
          latest-store.ts
          asset-store.ts
          manifest-store.ts
        sqlite/
          sqlite-client.ts
          migrations/
            001_create_docs_tables.sql
            002_create_fts_index.sql
          repositories/
            doc-page.repository.ts
            doc-chunk.repository.ts
            snapshot.repository.ts
        index.ts
      package.json
      tsconfig.json

    indexer/
      src/
        fts/
          sqlite-fts-indexer.ts
          search-query-parser.ts
        manifest/
          manifest-builder.ts
        diff/
          snapshot-differ.ts
        index.ts
      package.json
      tsconfig.json

    validator/
      src/
        rules/
          no-empty-page.rule.ts
          has-title.rule.ts
          has-source-url.rule.ts
          has-canonical-url.rule.ts
          has-content-hash.rule.ts
          valid-internal-links.rule.ts
          valid-anchors.rule.ts
          code-block-preserved.rule.ts
          asset-file-exists.rule.ts
          crawler-policy.rule.ts
        validation-result.ts
        validator.ts
        index.ts
      package.json
      tsconfig.json

    pipeline/
      src/
        steps/
          discover.step.ts
          fetch-markdown.step.ts
          fetch-html-fallback.step.ts
          extract-html-fallback.step.ts
          transform.step.ts
          chunk.step.ts
          index.step.ts
          validate.step.ts
          diff.step.ts
        pipeline-context.ts
        sync-pipeline.ts
        index.ts
      package.json
      tsconfig.json

    logger/
      src/
        logger.ts
        log-level.ts
        index.ts
      package.json
      tsconfig.json

    testing/
      src/
        fixtures/
        factories/
          doc-page.factory.ts
          snapshot.factory.ts
        helpers/
          temp-dir.ts
          mock-fetcher.ts
        index.ts
      package.json
      tsconfig.json

  data/
    snapshots/
    latest/

  generated/
    markdown/
    agent/
    search/

  docs/
    architecture/
      overview.md
      pipeline.md
      data-model.md
      storage-layout.md
      link-rewriting.md
      snapshot-retention.md
      agent-ingestion.md
    decisions/
      ADR-0001-use-typescript-monorepo.md
      ADR-0002-use-private-local-mirror.md
      ADR-0003-use-markdown-first-source-ingestion.md
      ADR-0004-use-sqlite-fts-for-v1.md
      ADR-0005-separate-generated-content-from-manual-notes.md
    operations/
      sync-docs.md
      validate-output.md
      restore-snapshot.md
    PRODUCT_REQUIREMENTS.md
    IMPLEMENTATION_PLAN.md
    DECISIONS.md
    OPEN_QUESTIONS.md

  configs/
    eslint/
      eslint.config.mjs
    typescript/
      tsconfig.base.json
      tsconfig.node.json
    vitest/
      vitest.config.ts
    prettier/
      prettier.config.cjs

  scripts/
    clean.ts
    bootstrap.ts
    check-workspace.ts
    prune-snapshots.ts

  .github/
    workflows/
      ci.yml

  .gitignore
  .npmrc
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  turbo.json
  tsconfig.json
  README.md
  AGENTS.md
```

---

## 30. AGENTS.md Seed

Codex MUST create `AGENTS.md` from this seed during Phase 0.

```md
# AGENTS.md

## Project Identity

This repository is `unofficial-codex-wiki`, an unofficial private local mirror of OpenAI Codex documentation for offline reading, local search, and AI-agent context ingestion.

This project is not affiliated with, endorsed by, or maintained by OpenAI.

## Source of Truth

Read `docs/PRODUCT_REQUIREMENTS.md` before making product or architecture decisions.

If requirements conflict, follow the precedence rules in `docs/PRODUCT_REQUIREMENTS.md`.

## V1 Scope

V1 implements a deterministic local documentation mirror:

official Codex docs -> Markdown-first fetch -> generated Markdown -> JSONL -> SQLite FTS5 -> CLI search/read -> validation.

V1 must not implement:

- public website publishing,
- local viewer,
- local API,
- MCP server,
- embeddings,
- vector database,
- chatbot,
- AI-generated summaries,
- AI-generated rewrites,
- scheduled sync,
- aggressive crawling.

## Working Style

- Inspect relevant files before editing.
- Plan before large changes.
- Prefer small, reviewable changes.
- Do not guess missing product decisions.
- Ask clarifying questions only when a decision is blocking and not answered by the PRD.
- Keep generated mirrored content separate from human-authored docs.

## Engineering Rules

- Use TypeScript strict mode.
- Use pnpm workspaces.
- Keep CLI code thin.
- Keep source-specific URL rules in `packages/sources`.
- Keep network fetching in `packages/crawler`.
- Keep storage in `packages/storage`.
- Keep validation in `packages/validator`.
- Centralize config in `packages/config`.
- Do not hardcode local link targets; resolve them through the manifest.

## Crawler Safety

- Use safe crawler profile by default.
- Prefer cache over network.
- Default page concurrency must be 1.
- Default page delay must be at least 5 seconds.
- Do not crawl external links.
- Do not crawl outside `/codex`.
- Offline mode must make zero network requests.

## Completion Requirements

Before saying work is complete, run relevant checks when possible:

- `pnpm typecheck`
- `pnpm test`
- `pnpm docs:validate`

Final response must include:

- files changed,
- commands run,
- validation result,
- assumptions,
- risks,
- next step.
```

---

## 31. Open Questions and Defaults

This PRD intentionally resolves the main v1 choices.

Agents should not ask about:

- language: TypeScript,
- package manager: pnpm,
- source scope: Codex docs under `/codex`,
- primary discovery: `/codex/llms.txt`,
- primary content path: Markdown-first,
- v1 search: SQLite FTS5,
- v1 output: Markdown, JSONL, SQLite,
- v1 no MCP,
- v1 no embeddings,
- v1 no viewer,
- v1 no public publishing,
- v1 no AI summaries.

Agents may ask only if one of these becomes blocking:

1. Should Node.js 22 be enforced through `.nvmrc` only, or should the repo also use Volta?
2. Should generated content be committed to Git, ignored by default, or partially committed?
3. Should snapshot retention keep all snapshots or prune after a fixed count?
4. Should the initial sync require explicit user confirmation before network requests?
5. What exact minimum Windows and macOS versions should be documented if GitHub Actions `windows-latest` and `macos-latest` are not specific enough?

If the user does not answer, use these defaults:

| Question | Default |
|---|---|
| Node version enforcement | Add `.nvmrc` with `22`; do not add Volta unless requested. |
| Generated content in Git | Ignore `data/` and `generated/` by default; document how to override. |
| Snapshot retention | Keep all snapshots in v1; add pruning later. |
| Network confirmation | CLI does not prompt by default, but logs selected profile and scope clearly. |
| Windows and macOS versions | Validate with GitHub Actions `windows-latest` and `macos-latest`; document exact local minimums only after user confirms them. |

---

## 32. Final V1 Definition of Done

V1 is done when this command sequence works in a clean checkout:

```text
pnpm install
pnpm typecheck
pnpm test
pnpm docs:sync
pnpm docs:validate
pnpm docs:search "codex"
pnpm docs:read <known-page>
```

on Ubuntu/Linux, Windows, and macOS, and all of the following are true:

- source discovery comes from `/codex/llms.txt`,
- content fetch is Markdown-first,
- HTML is fallback only,
- no external sites are crawled,
- no out-of-scope docs are crawled,
- generated Markdown exists,
- generated JSONL exists,
- SQLite FTS5 search database exists,
- all generated pages preserve source metadata,
- internal links resolve locally,
- external links remain external,
- offline mode makes zero network requests,
- required scripts avoid Bash-only behavior,
- generated metadata uses portable project-relative paths,
- no AI summaries exist,
- no embeddings, vector database, RAG pipeline, chatbot, MCP server, viewer, or public publishing exists in v1,
- README explains setup, sync, search, read, validate, offline mode, and private-use boundary.

End of PRD.
