# Official Codex References Used For Phase 0

This Phase 0 bootstrap was shaped by the provided PRD and official OpenAI Codex documentation.

## References

| Reference | URL | How it shaped this repo |
|---|---|---|
| Custom instructions with AGENTS.md | https://developers.openai.com/codex/guides/agents-md | Root `AGENTS.md` is the durable project guidance file Codex should load before work. |
| Codex customization | https://developers.openai.com/codex/concepts/customization | `AGENTS.md` stays focused on persistent repo guidance, while detailed requirements stay in docs. |
| Codex quickstart | https://developers.openai.com/codex/quickstart | The handoff prompt assumes the next Codex agent starts by selecting this project and reading repo guidance. |
| Codex llms.txt | https://developers.openai.com/codex/llms.txt | The PRD's source discovery model uses the official Codex docs map and Markdown twins. |

## Phase 0 Interpretation

The official Codex docs describe `AGENTS.md` as project guidance, not as a replacement for full project requirements. For this repo, the implementation detail lives in:

- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DECISIONS.md`

The root `AGENTS.md` stays concise so future Codex sessions can load it reliably before work.
