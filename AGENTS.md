# AGENTS.md

## Project Identity

This repository is `unofficial-codex-wiki`, an unofficial private local mirror of OpenAI Codex documentation for offline reading, local search, and AI-agent context ingestion.

This project is not affiliated with, endorsed by, or maintained by OpenAI.

## Source of Truth

Read `docs/PRODUCT_REQUIREMENTS.md` before making product or architecture decisions.

If requirements conflict, follow the precedence rules in `docs/PRODUCT_REQUIREMENTS.md`.

Keep this file concise. Detailed product requirements belong in `docs/PRODUCT_REQUIREMENTS.md`, and detailed execution sequencing belongs in `docs/IMPLEMENTATION_PLAN.md`.

## Current Phase

Phase 0 agent customization is complete.

Milestone 1 scaffold and domain types are complete.

Milestone 2 discovery and safe fetching are complete.

Milestone 3 Markdown generation and link rewriting are complete.

Milestone 4 JSONL chunking and search are complete.

Milestone 5 validation, snapshots, and docs are complete.

V1 implementation is complete when `pnpm docs:sync`, `pnpm docs:validate`, `pnpm docs:search`, and `pnpm docs:read` pass against a complete local mirror.

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
- Record changed product or architecture decisions in `docs/DECISIONS.md`.

## Engineering Rules

- Use TypeScript strict mode.
- Use Node.js 24 or newer.
- Use pnpm workspaces.
- Keep CLI code thin.
- Keep source-specific URL rules in `packages/sources`.
- Keep network fetching in `packages/crawler`.
- Keep storage in `packages/storage`.
- Keep validation in `packages/validator`.
- Centralize config in `packages/config`.
- Do not hardcode local link targets; resolve them through the manifest.
- Keep required scripts cross-platform for Ubuntu/Linux, Windows, and macOS.
- Avoid Bash-only assumptions in required workflows.
- Use portable project-relative paths in generated metadata.

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

If those checks are not available yet, say so clearly.

Final response must include:

- files changed,
- commands run,
- validation result,
- assumptions,
- risks,
- next step.
