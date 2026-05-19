# Decisions

Status: initialized from `docs/PRODUCT_REQUIREMENTS.md` during Phase 0.

## Fixed Product Decisions

| Area | Decision |
|---|---|
| Repository name | `unofficial-codex-wiki` |
| Product type | Private local documentation mirror and ingestion pipeline |
| Main language | TypeScript |
| Runtime | Node.js 24 or newer |
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

## Defaults Chosen From PRD

| Question | Default |
|---|---|
| Node version enforcement | Add `.nvmrc` with `24` during Milestone 1; do not add Volta unless requested. |
| Generated content in Git | Ignore `data/` and `generated/` by default; document how to override. |
| Snapshot retention | Keep all snapshots in v1; add pruning later. |
| Network confirmation | CLI does not prompt by default, but logs selected profile and scope clearly. |
| Windows and macOS versions | Validate with GitHub Actions `windows-latest` and `macos-latest`; document exact local minimums only after user confirms them. |

## Phase 0 Decisions

| Area | Decision |
|---|---|
| Canonical PRD location | `docs/PRODUCT_REQUIREMENTS.md` |
| Original PRD filename inside repo | Do not keep a second PRD copy in the repo to avoid split authority. |
| Root Codex guidance | Use one concise `AGENTS.md`; keep long detail in docs. |
| Open questions file | Do not create `docs/OPEN_QUESTIONS.md` because current blocking questions are resolved by PRD defaults. |
| Repo skills | Do not create `.agents/skills` in v0. |
| Repo Codex rules | Do not create `.codex/rules` in v0. |
| Dependencies | Do not install dependencies in Phase 0. |
| Product code | Do not write product implementation code in Phase 0. |
| Git commit | Initialize Git only; do not create a commit unless the user asks. |

## Milestone 1 Decisions

| Area | Decision |
|---|---|
| CLI placeholders | Create required CLI command names in Milestone 1, but make future pipeline commands fail non-zero with an explicit not-yet-implemented message. |
| TypeScript project references | Use TypeScript build mode for workspace typechecking because composite project references cannot be typechecked with root `--noEmit`. Generated `dist/` output remains ignored. |
| pnpm activation | Keep repo enforcement to `.nvmrc` and `engines.node >=24`; do not add Volta or custom shell activation. |
| Local dev scripts | Optional OS-specific helper scripts may live under `scripts/for-local-dev/`; required package scripts must remain cross-platform and pnpm-driven. |

## Milestone 2 Decisions

| Area | Decision |
|---|---|
| Discovery output | Keep `data/latest/discovery/openai-codex.urls.json` PRD-shaped with `urls` as normalized Markdown source URLs. |
| Raw Markdown cache | Store fetched Markdown under `data/latest/raw-markdown/` and copy fetched/cached pages into timestamped snapshots. |
| CLI project root | Resolve the repository root from the workspace package name so `pnpm --filter` commands write root-level `data/`, not `apps/cli/data/`. |
| CLI TypeScript runner | Use `node --import tsx src/main.ts` for the CLI dev script to avoid `tsx` IPC pipe failures in restricted sandboxes. |
| Later commands | Keep `extract`, `transform`, `chunk`, `index`, `validate`, `search`, `read`, and `sync` as non-zero placeholders after Milestone 2. |

## Milestone 3 Decisions

| Area | Decision |
|---|---|
| Transform command | Implement `docs:transform` as the Milestone 3 command and keep later commands as non-zero placeholders. |
| Generated Markdown root page | Map the Codex root page ID `codex` to `generated/markdown/codex/index.md`; map other page IDs to `generated/markdown/codex/<id>.md`. |
| Markdown transformation dependencies | Use a small deterministic TypeScript transformer for Milestone 3 front matter, heading extraction, and link rewriting without adding new network-installed dependencies in this pass. Revisit `unified`/`remark`/`gray-matter` before richer Markdown parsing or HTML fallback work. |
| Asset policy | Classify inline Markdown images as `asset` links and preserve their original URLs in Milestone 3; defer asset fetching and content-addressed local asset filenames until a later v1 pass that needs offline asset mirroring. |
| Manifest output | Write `data/latest/manifest.json` and a timestamped snapshot manifest during transform; write `data/latest/metadata/openai-codex.transform.json` for command diagnostics. |

## Milestone 4 Decisions

| Area | Decision |
|---|---|
| Agent page content | Strip generated front matter before writing JSONL page and chunk content; source metadata remains in each JSONL record. |
| Chunk IDs | Use stable per-page chunk IDs in the form `<page-id>#chunk-<1-based-index>`. |
| Chunk boundaries | Prefer heading-bound sections and split oversized sections by Markdown blocks while preserving fenced code blocks. |
| SQLite implementation | Use `better-sqlite3` and SQLite FTS5 for `generated/search/docs.sqlite`, with migrations recorded under `packages/storage/src/sqlite/migrations/`. |
| FTS heading path storage | Store both structured `heading_path_json` and plain `heading_path`; the plain text column backs the FTS table and the JSON column backs structured search results. |
| Read command matching | Resolve pages by manifest ID, generated local path, source/canonical/Markdown URL, or title slug; `#anchor` reads print the matching Markdown section. |
| Native dependency build | In restricted sandboxes, build `better-sqlite3` under Node 24 with writable temp npm/node-gyp cache locations if the default home caches are read-only. |

## Milestone 5 Decisions

| Area | Decision |
|---|---|
| Validation strictness | Keep `docs:validate` strict against the full discovery output; limited `--limit` smoke data may fail validation because it is not a complete local mirror. |
| Validation report | Write validation output to `data/latest/validation-report.json` and mirror it into a timestamped snapshot. |
| Sync orchestration | Implement `docs:sync` as `discover -> fetch -> transform -> chunk -> index -> validate -> diff`; fail before diff if validation fails. |
| Snapshot diff | Compare the latest manifest against the previous snapshot manifest by page ID and content hash, writing `data/latest/diff.json`. |
| Documentation | Keep operational runbook guidance in `docs/operations/local-mirror.md` and high-level usage in `README.md`. |

## V1 Stabilization Decisions

| Area | Decision |
|---|---|
| Sync progress output | Use stable line-oriented `docs:sync` progress logs instead of terminal progress bars so copied output and CI logs remain readable. Keep `--json` output machine-readable and free of progress lines. |
| Source link aliases | Rewrite a small deterministic set of upstream Codex aliases to already mirrored pages when the source link is stable but omitted from `llms.txt`: `/codex/auth/ci-cd-auth`, `/codex/app/artifacts`, `/codex/guides/slash-commands`, `/codex/ide/cloud-tasks`, `/codex/plugins/build-web-apps`, and `/codex/skills/create-skill`. |
| Source anchor aliases | Rewrite known upstream anchor aliases to generated heading anchors for `/goal` and Team Config links instead of hardcoding local output paths. |
| Non-page Codex resources | Treat known non-documentation Codex resources such as `config-schema.json`, article images, and Codex program terms as preserved external/resource links rather than missing mirrored Markdown pages. |
| Use-cases coverage | Crawl the official `/codex/use-cases` HTML index and discovered `/codex/use-cases/**` page links as an explicitly user-approved static HTML fallback, because this section is displayed on the official site but is not listed in `llms.txt`. |
| Use-cases organization | Store fetched use-case source HTML under `data/latest/raw-html/use-cases/` and generate Markdown under `generated/markdown/codex/use-cases/` so local data and generated output follow the official URL hierarchy. |
| Use-cases filter URLs | Ignore query-only use-case filter/search URLs as separate pages; normalize them to the canonical `/codex/use-cases` page to avoid mirroring UI state as duplicate documents. |
| Page descriptions | Preserve official page descriptions from `/codex/llms.txt` as generated metadata and render them as a Markdown blockquote below each top-level heading so local read/search output matches useful website context without switching to HTML-first crawling. |

## Decision Update Rule

When a future Codex agent changes a product or architecture decision, update this file in the same task and explain the reason in the final response.
