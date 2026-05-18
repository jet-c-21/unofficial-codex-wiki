# Decisions

Status: initialized from `docs/PRODUCT_REQUIREMENTS.md` during Phase 0.

## Fixed Product Decisions

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

## Defaults Chosen From PRD

| Question | Default |
|---|---|
| Node version enforcement | Add `.nvmrc` with `22` during Milestone 1; do not add Volta unless requested. |
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

## Decision Update Rule

When a future Codex agent changes a product or architecture decision, update this file in the same task and explain the reason in the final response.
