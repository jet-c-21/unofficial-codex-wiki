import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createCli } from "./cli.js";

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
});
