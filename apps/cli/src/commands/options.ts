import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CacheMode, CrawlerProfile } from "@unofficial-codex-wiki/config";
import type { PipelineCommandOptions } from "@unofficial-codex-wiki/pipeline";

export type CommonCliOptions = {
  profile?: string;
  cacheMode?: string;
  offline?: boolean;
  force?: boolean;
  snapshot?: string;
  limit?: string;
  json?: boolean;
  verbose?: boolean;
};

const crawlerProfiles = new Set(["offline", "safe", "balanced"]);
const cacheModes = new Set(["prefer-cache", "refresh", "force", "offline"]);

export function toPipelineCommandOptions(options: CommonCliOptions): PipelineCommandOptions {
  const pipelineOptions: PipelineCommandOptions = {
    projectRoot: findProjectRoot()
  };

  if (options.profile !== undefined) {
    if (!crawlerProfiles.has(options.profile)) {
      throw new Error(`Unsupported crawler profile: ${options.profile}`);
    }
    pipelineOptions.profile = options.profile as CrawlerProfile;
  }

  if (options.cacheMode !== undefined) {
    if (!cacheModes.has(options.cacheMode)) {
      throw new Error(`Unsupported cache mode: ${options.cacheMode}`);
    }
    pipelineOptions.cacheMode = options.cacheMode as CacheMode;
  }

  if (options.offline === true) {
    pipelineOptions.offline = true;
  }

  if (options.force === true) {
    pipelineOptions.force = true;
  }

  if (options.limit !== undefined) {
    const limit = Number.parseInt(options.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`Invalid --limit value: ${options.limit}`);
    }
    pipelineOptions.limit = limit;
  }

  return pipelineOptions;
}

export function printCommandError(commandName: string, error: unknown, json?: boolean): void {
  const message = error instanceof Error ? error.message : String(error);

  if (json === true) {
    console.log(JSON.stringify({
      command: commandName,
      ok: false,
      error: message
    }));
  } else {
    console.error(`${commandName} failed: ${message}`);
  }

  process.exitCode = 1;
}

function findProjectRoot(): string {
  const cwdRoot = findRootFrom(process.cwd());
  if (cwdRoot !== undefined) {
    return cwdRoot;
  }

  const initCwd = process.env.INIT_CWD;
  if (initCwd !== undefined) {
    const initRoot = findRootFrom(initCwd);
    if (initRoot !== undefined) {
      return initRoot;
    }
  }

  return process.cwd();
}

function findRootFrom(startDir: string): string | undefined {
  let currentDir = path.resolve(startDir);

  while (true) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name?: string };
        if (packageJson.name === "unofficial-codex-wiki") {
          return currentDir;
        }
      } catch {
        return undefined;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
}
