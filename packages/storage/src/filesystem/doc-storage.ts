import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeProjectRelativePath, toPortablePath } from "@unofficial-codex-wiki/core";
import { normalizeCodexPageUrl, type CodexDiscoveryOutput } from "@unofficial-codex-wiki/sources";

export type FetchPageRecord = {
  url: string;
  localRawMarkdownPath: string;
  status: "fetched" | "cached" | "failed";
  failureReason?: string;
};

export type FetchReport = {
  fetchedAt: string;
  pageCount: number;
  pages: FetchPageRecord[];
};

export type DocStorageOptions = {
  projectRoot?: string;
};

export class DocStorage {
  private readonly projectRoot: string;

  constructor(options: DocStorageOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();
  }

  async writeDiscoveryOutput(discovery: CodexDiscoveryOutput, snapshotId = createSnapshotId()): Promise<void> {
    await this.writeJson("data/latest/discovery/openai-codex.urls.json", discovery);
    await this.writeJson(`data/snapshots/${snapshotId}/discovery/openai-codex.urls.json`, discovery);
  }

  async readLatestDiscoveryOutput(): Promise<CodexDiscoveryOutput> {
    return this.readJson<CodexDiscoveryOutput>("data/latest/discovery/openai-codex.urls.json");
  }

  async discoveryOutputExists(): Promise<boolean> {
    return this.fileExists("data/latest/discovery/openai-codex.urls.json");
  }

  createDiscoveryDocumentCache() {
    const relativePath = "data/latest/discovery/openai-codex.llms.txt";

    return {
      exists: async () => this.fileExists(relativePath),
      read: async () => this.readText(relativePath),
      write: async (content: string) => {
        await this.writeText(relativePath, content);
      }
    };
  }

  getRawMarkdownRelativePath(markdownSourceUrl: string): string {
    const normalized = normalizeCodexPageUrl(markdownSourceUrl);
    return toPortablePath(path.posix.join("data", "latest", "raw-markdown", `${normalized.id}.md`));
  }

  createRawMarkdownCache(markdownSourceUrl: string) {
    const relativePath = this.getRawMarkdownRelativePath(markdownSourceUrl);

    return {
      exists: async () => this.fileExists(relativePath),
      read: async () => this.readText(relativePath),
      write: async (content: string) => {
        await this.writeText(relativePath, content);
      }
    };
  }

  async copyLatestRawMarkdownToSnapshot(markdownSourceUrl: string, snapshotId: string): Promise<string> {
    const latestRelativePath = this.getRawMarkdownRelativePath(markdownSourceUrl);
    const content = await this.readText(latestRelativePath);
    const normalized = normalizeCodexPageUrl(markdownSourceUrl);
    const snapshotRelativePath = toPortablePath(path.posix.join("data", "snapshots", snapshotId, "raw-markdown", `${normalized.id}.md`));
    await this.writeText(snapshotRelativePath, content);
    return snapshotRelativePath;
  }

  async writeFetchReport(report: FetchReport, snapshotId: string): Promise<void> {
    await this.writeJson("data/latest/metadata/openai-codex.fetch.json", report);
    await this.writeJson(`data/snapshots/${snapshotId}/metadata/openai-codex.fetch.json`, report);
  }

  toAbsolutePath(relativePath: string): string {
    return path.resolve(this.projectRoot, relativePath);
  }

  toProjectRelativePath(pathValue: string): string {
    return normalizeProjectRelativePath(pathValue, this.projectRoot);
  }

  private async fileExists(relativePath: string): Promise<boolean> {
    try {
      await readFile(this.toAbsolutePath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  private async readText(relativePath: string): Promise<string> {
    return readFile(this.toAbsolutePath(relativePath), "utf8");
  }

  private async writeText(relativePath: string, content: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }

  private async readJson<T>(relativePath: string): Promise<T> {
    return JSON.parse(await this.readText(relativePath)) as T;
  }

  private async writeJson(relativePath: string, value: unknown): Promise<void> {
    await this.writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`);
  }
}

export function createSnapshotId(date = new Date()): string {
  return date.toISOString().replace(/[:.]/gu, "-");
}
