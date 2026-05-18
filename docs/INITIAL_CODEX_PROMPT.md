# Initial Prompt For The Next Codex Agent

Use this prompt after opening this repository in Codex:

```text
You are working in the repository `unofficial-codex-wiki`.

Phase 0 agent customization is already complete.

Before doing any implementation work:
1. Read `AGENTS.md`.
2. Read `docs/PRODUCT_REQUIREMENTS.md`.
3. Read `docs/IMPLEMENTATION_PLAN.md`.
4. Read `docs/DECISIONS.md`.
5. Confirm that the repository is still in Phase 0 and that no product implementation code exists.

Your first task is to summarize:
- the v1 product goal,
- the fixed decisions,
- the excluded v1 features,
- the Milestone 1 implementation scope,
- the validation commands Milestone 1 should support.

Do not implement Milestone 1 until I explicitly approve it.

Rules:
- Do not guess missing product decisions.
- Do not implement excluded v1 features.
- Do not add MCP, embeddings, vector database, chatbot, public hosting, scheduled sync, AI summaries, local API, or a local viewer in v1.
- Keep required scripts cross-platform for Ubuntu/Linux, Windows, and macOS.
- If a requirement conflicts, follow the precedence rules in `docs/PRODUCT_REQUIREMENTS.md`.
```

After the user approves Milestone 1, follow `docs/IMPLEMENTATION_PLAN.md` and keep all implementation choices aligned with `docs/PRODUCT_REQUIREMENTS.md`.
