import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "./cli.js";
import { formatSyncProgressEvent, formatValidationFailureSummary } from "./commands/sync.command.js";

describe("CLI skeleton", () => {
  it("registers the required v1 command surface", () => {
    const commandNames = createCli().commands.map((command) => command.name()).sort();

    expect(commandNames).toEqual([
      "chunk",
      "discover",
      "extract",
      "fetch",
      "index",
      "read",
      "search",
      "sync",
      "transform",
      "validate"
    ]);
  });

  it("keeps root docs scripts delegated through pnpm instead of shell-only glue", async () => {
    const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    const docsScripts = Object.entries(packageJson.scripts).filter(([name]) => name.startsWith("docs:"));

    expect(docsScripts).toHaveLength(10);
    for (const [, script] of docsScripts) {
      expect(script).toContain("pnpm --filter @unofficial-codex-wiki/cli codex-wiki");
      expect(script).not.toMatch(/&&|;|\|\||\|/u);
    }
  });

  it("reports offline discovery cache misses as JSON without throwing", async () => {
    const originalCwd = process.cwd();
    const projectRoot = await mkdtemp(join(tmpdir(), "codex-wiki-cli-"));
    const logs: string[] = [];
    const originalLog = console.log;
    const originalExitCode = process.exitCode;
    const originalInitCwd = process.env.INIT_CWD;

    try {
      process.chdir(projectRoot);
      process.env.INIT_CWD = projectRoot;
      process.exitCode = undefined;
      console.log = (value?: unknown) => {
        logs.push(String(value));
      };

      await createCli().parseAsync(["node", "codex-wiki", "discover", "--offline", "--json"]);

      expect(process.exitCode).toBe(1);
      expect(JSON.parse(logs[0] ?? "{}")).toMatchObject({
        command: "discover",
        ok: false
      });
    } finally {
      console.log = originalLog;
      process.exitCode = originalExitCode;
      if (originalInitCwd === undefined) {
        delete process.env.INIT_CWD;
      } else {
        process.env.INIT_CWD = originalInitCwd;
      }
      process.chdir(originalCwd);
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("keeps sync JSON output parseable without progress lines", async () => {
    const originalCwd = process.cwd();
    const projectRoot = await mkdtemp(join(tmpdir(), "codex-wiki-cli-"));
    const logs: string[] = [];
    const originalLog = console.log;
    const originalExitCode = process.exitCode;
    const originalInitCwd = process.env.INIT_CWD;

    try {
      process.chdir(projectRoot);
      process.env.INIT_CWD = projectRoot;
      process.exitCode = undefined;
      console.log = (value?: unknown) => {
        logs.push(String(value));
      };

      await createCli().parseAsync(["node", "codex-wiki", "sync", "--offline", "--json"]);

      expect(process.exitCode).toBe(1);
      expect(logs).toHaveLength(1);
      expect(JSON.parse(logs[0] ?? "{}")).toMatchObject({
        command: "sync",
        ok: false
      });
    } finally {
      console.log = originalLog;
      process.exitCode = originalExitCode;
      if (originalInitCwd === undefined) {
        delete process.env.INIT_CWD;
      } else {
        process.env.INIT_CWD = originalInitCwd;
      }
      process.chdir(originalCwd);
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("prints stable sync progress lines in human mode", async () => {
    const originalCwd = process.cwd();
    const projectRoot = await mkdtemp(join(tmpdir(), "codex-wiki-cli-"));
    const logs: string[] = [];
    const errors: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalExitCode = process.exitCode;
    const originalInitCwd = process.env.INIT_CWD;

    try {
      process.chdir(projectRoot);
      process.env.INIT_CWD = projectRoot;
      process.exitCode = undefined;
      console.log = (value?: unknown) => {
        logs.push(String(value));
      };
      console.error = (value?: unknown) => {
        errors.push(String(value));
      };

      await createCli().parseAsync(["node", "codex-wiki", "sync", "--offline"]);

      expect(process.exitCode).toBe(1);
      expect(logs).toEqual(expect.arrayContaining([
        "[sync] Starting local Codex docs sync",
        "[discover] Discovering Codex documentation URLs"
      ]));
      expect(errors[0]).toContain("sync failed: Offline discovery cache miss");
    } finally {
      console.log = originalLog;
      console.error = originalError;
      process.exitCode = originalExitCode;
      if (originalInitCwd === undefined) {
        delete process.env.INIT_CWD;
      } else {
        process.env.INIT_CWD = originalInitCwd;
      }
      process.chdir(originalCwd);
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("formats fetch progress and validation summaries for readable sync output", () => {
    expect(formatSyncProgressEvent({
      step: "fetch",
      phase: "progress",
      message: "Fetched 1/2: cli (fetched)",
      current: 1,
      total: 2,
      item: "cli",
      status: "fetched",
      elapsedMs: 5_000,
      estimatedRemainingMs: 5_000
    })).toBe("[fetch] 1/2 cli fetched, elapsed 5s, eta 5s");

    expect(formatValidationFailureSummary({
      validatedAt: "2026-05-19T00:00:00.000Z",
      ok: false,
      errorCount: 2,
      warningCount: 0,
      checks: [{
        name: "links-and-anchors",
        ok: false,
        issues: [{
          code: "missing-anchor-target",
          severity: "error",
          message: "Anchor target is missing: #missing",
          path: "generated/markdown/codex/cli.md"
        }, {
          code: "missing-anchor-target",
          severity: "error",
          message: "Anchor target is missing: #other",
          path: "generated/markdown/codex/app.md"
        }]
      }]
    })).toEqual(expect.arrayContaining([
      "Validation summary: 2 error(s), 0 warning(s)",
      "  - missing-anchor-target: 2 error(s); example: generated/markdown/codex/cli.md"
    ]));
  });
});
