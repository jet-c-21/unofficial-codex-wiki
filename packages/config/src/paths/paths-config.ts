import { joinPortablePath, normalizeProjectRelativePath } from "@unofficial-codex-wiki/core";

export type PathsConfig = {
  projectRoot: string;
  dataDir: string;
  snapshotsDir: string;
  latestDir: string;
  generatedDir: string;
  generatedMarkdownDir: string;
  generatedAgentDir: string;
  generatedSearchDir: string;
};

export function createPathsConfig(projectRoot = process.cwd()): PathsConfig {
  return {
    projectRoot,
    dataDir: "data",
    snapshotsDir: joinPortablePath("data", "snapshots"),
    latestDir: joinPortablePath("data", "latest"),
    generatedDir: "generated",
    generatedMarkdownDir: joinPortablePath("generated", "markdown"),
    generatedAgentDir: joinPortablePath("generated", "agent"),
    generatedSearchDir: joinPortablePath("generated", "search")
  };
}

export function toProjectRelativePath(pathValue: string, projectRoot = process.cwd()): string {
  return normalizeProjectRelativePath(pathValue, projectRoot);
}
