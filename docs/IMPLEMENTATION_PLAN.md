# Implementation Plan

Status: Milestone 5 complete
Source of truth: `docs/PRODUCT_REQUIREMENTS.md`

## Phase 0 - Agent Customization and Planning

Goal: prepare the repository for another Codex code agent without writing product implementation code.

Completed Phase 0 outputs:

- `AGENTS.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DECISIONS.md`
- `docs/INITIAL_CODEX_PROMPT.md`
- `docs/CODEX_OFFICIAL_REFERENCES.md`
- `README.md`
- `.gitignore`

`docs/OPEN_QUESTIONS.md` is intentionally not created because the PRD resolves current blocking questions with defaults.

Phase 0 boundaries:

- Do not install dependencies.
- Do not create package scaffolding.
- Do not run code generation.
- Do not write product implementation code.
- Do not create `.agents/skills` or `.codex/rules` in v0.

## Milestone 1 - Monorepo Scaffold and Domain Types

Complete.

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

Milestone 1 note: future pipeline CLI commands exist only as explicit non-zero placeholder commands. They do not fetch docs, create mirror output, or claim the pipeline works.

## Milestone 2 - Discovery and Safe Fetching

Complete.

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

Milestone 2 note: `docs:discover` and `docs:fetch` are implemented. `docs:fetch` writes raw Markdown cache under `data/`, not generated mirror output. `docs:sync` remains intentionally unimplemented until a later milestone.

## Milestone 3 - Markdown Generation and Link Rewriting

Complete.

Implemented:

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

Milestone 3 note: `docs:transform` is implemented for Markdown-first fetched pages. It writes generated Markdown under `generated/markdown/codex/`, latest manifest metadata under `data/latest/manifest.json`, and a transform report under `data/latest/metadata/openai-codex.transform.json`. Article image links are classified as assets and preserved in place; asset downloading/mirroring remains limited to a later v1 pass when required for offline reading.

## Milestone 4 - JSONL Chunks and Search

Complete.

Implemented:

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

Milestone 4 note: `docs:chunk`, `docs:index`, `docs:search`, and `docs:read` are implemented. Chunking reads generated Markdown, strips generated front matter from agent content, preserves heading boundaries where possible, and writes `generated/agent/docs.pages.jsonl`, `generated/agent/docs.chunks.jsonl`, and `generated/agent/docs.manifest.json`. Indexing uses `better-sqlite3` with SQLite FTS5 at `generated/search/docs.sqlite`.

## Milestone 5 - Validation, Snapshots, and Docs

Complete.

Implemented:

- full validator,
- validation report,
- snapshot diff,
- README usage docs,
- operations docs.

Validation:

- `pnpm docs:sync` passes,
- `pnpm docs:validate` passes,
- all PRD acceptance criteria are met.

Milestone 5 note: `docs:validate` now writes `data/latest/validation-report.json` and exits non-zero when the local mirror is incomplete. `docs:sync` runs the full pipeline and writes `data/latest/diff.json` after validation passes. Limited smoke runs can still fail validation because the validator checks coverage against the full discovery output.

## V1 Definition of Done

V1 is done when this command sequence works in a clean checkout on Ubuntu/Linux, Windows, and macOS:

```text
pnpm install
pnpm typecheck
pnpm test
pnpm docs:sync
pnpm docs:validate
pnpm docs:search "codex"
pnpm docs:read <known-page>
```

V1 must preserve the exclusions listed in `docs/PRODUCT_REQUIREMENTS.md`, including no MCP server, no embeddings, no vector database, no chatbot, no local viewer, no public publishing, no scheduled sync, and no AI-generated summaries.
