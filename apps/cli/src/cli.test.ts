import { mkdir, readFile, writeFile } from "node:fs/promises";
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
      "export-course-materials",
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

    expect(docsScripts).toHaveLength(11);
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

  it("prints recovery commands when course materials export sees a broken mirror", async () => {
    const originalCwd = process.cwd();
    const projectRoot = await mkdtemp(join(tmpdir(), "codex-wiki-cli-export-broken-"));
    const errors: string[] = [];
    const originalError = console.error;
    const originalExitCode = process.exitCode;
    const originalInitCwd = process.env.INIT_CWD;

    try {
      process.chdir(projectRoot);
      process.env.INIT_CWD = projectRoot;
      process.exitCode = undefined;
      console.error = (value?: unknown) => {
        errors.push(String(value));
      };

      await mkdir(join(projectRoot, "data/latest"), { recursive: true });
      await mkdir(join(projectRoot, "generated/markdown/codex"), { recursive: true });
      await mkdir(join(projectRoot, "generated/agent"), { recursive: true });
      await mkdir(join(projectRoot, "generated/search"), { recursive: true });
      await writeFile(join(projectRoot, "generated/markdown/codex/cli.md"), "");
      await writeFile(join(projectRoot, "generated/agent/docs.pages.jsonl"), "");
      await writeFile(join(projectRoot, "generated/agent/docs.chunks.jsonl"), "");
      await writeFile(join(projectRoot, "generated/search/docs.sqlite"), "");
      await writeFile(join(projectRoot, "data/latest/manifest.json"), `${JSON.stringify({
        generatedAt: "2026-05-19T00:00:00.000Z",
        source: "https://developers.openai.com/codex/llms.txt",
        pageCount: 1,
        pages: [{
          id: "cli",
          title: "Codex CLI",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          localJsonlChunkIds: [],
          contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          fetchedAt: "2026-05-19T00:00:00.000Z",
          status: "new"
        }]
      }, null, 2)}\n`);

      await createCli().parseAsync(["node", "codex-wiki", "export-course-materials"]);

      const output = errors.join("\n");
      expect(process.exitCode).toBe(1);
      expect(output).toContain("generated mirror validation failed");
      expect(output).toContain("generated/agent/docs.pages.jsonl: empty");
      expect(output).toContain("empty generated Markdown files: 1");
      expect(output).toContain("missing-jsonl-page");
      expect(output).toContain("pnpm docs:sync");
      expect(output).toContain("pnpm docs:export-course-materials");
    } finally {
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
