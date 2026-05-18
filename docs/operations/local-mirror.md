# Local Mirror Operations

This project creates an unofficial private local mirror of selected OpenAI Codex documentation. Do not publish generated mirrored content as a public website.

## Normal Sync

Use the full pipeline:

```bash
pnpm docs:sync
```

The sync command runs:

```text
discover -> fetch -> transform -> chunk -> index -> validate -> diff
```

The default crawler policy is safe, cache-first, and slow by design. Page concurrency stays at 1 and the default delay between page requests is at least 5 seconds.

## Partial Runs

For debugging:

```bash
pnpm docs:discover
pnpm docs:fetch
pnpm docs:transform
pnpm docs:chunk
pnpm docs:index
pnpm docs:validate
```

`--limit` is useful for smoke tests, but validation is strict against the full discovery output. A limited run can produce a useful local sample while still failing `docs:validate`.

## Offline Mode

Offline mode must make zero network requests:

```bash
pnpm docs:discover --offline
pnpm docs:fetch --offline
```

Offline commands require local cache files under `data/latest/`.

## Search And Read

After chunking and indexing:

```bash
pnpm docs:search "sandbox"
pnpm docs:read agent-approvals-security
pnpm docs:read agent-approvals-security#sandbox-and-approvals
```

Search uses SQLite FTS5 at `generated/search/docs.sqlite`; it does not use embeddings or semantic search.

## Native SQLite Build

`better-sqlite3` is a native dependency. On Ubuntu/Linux, Windows, or macOS, make sure the normal native build toolchain for Node.js packages is available.

In restricted sandboxes where home caches are read-only, rebuild with writable temp caches, for example:

```bash
PATH=/home/puff/.nvm/versions/node/v24.15.0/bin:$PATH \
npm_config_cache=/tmp/unofficial-codex-wiki-npm-cache \
npm_config_devdir=/tmp/unofficial-codex-wiki-node-gyp \
npm_config_nodedir=/home/puff/.nvm/versions/node/v24.15.0 \
npm run build-release
```

Run that from the installed `better-sqlite3` package directory only when the binding is missing.

## Generated Outputs

Generated content is ignored by Git by default:

```text
data/
generated/
```

Important files:

```text
data/latest/manifest.json
data/latest/validation-report.json
data/latest/diff.json
generated/markdown/codex/
generated/agent/docs.pages.jsonl
generated/agent/docs.chunks.jsonl
generated/agent/docs.manifest.json
generated/search/docs.sqlite
```
