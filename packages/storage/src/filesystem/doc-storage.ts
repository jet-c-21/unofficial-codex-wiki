import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  normalizeProjectRelativePath,
  toPortablePath,
  type AgentDocChunkRecord,
  type AgentDocPageRecord,
  type ManifestPage
} from "@unofficial-codex-wiki/core";
import { normalizeCodexPageUrl, type CodexDiscoveryOutput } from "@unofficial-codex-wiki/sources";

export type FetchPageRecord = {
  url: string;
  sourceType: "markdown" | "html";
  localRawMarkdownPath?: string;
  localRawHtmlPath?: string;
  status: "fetched" | "cached" | "failed";
  failureReason?: string;
};

export type FetchReport = {
  fetchedAt: string;
  pageCount: number;
  pages: FetchPageRecord[];
};

export type DocsManifest = {
  generatedAt: string;
  source: string;
  pageCount: number;
  pages: ManifestPage[];
};

export type TransformPageRecord = {
  id: string;
  sourceUrl: string;
  localMarkdownPath: string;
  status: "generated" | "failed";
  failureReason?: string;
};

export type TransformReport = {
  transformedAt: string;
  pageCount: number;
  generatedPageCount: number;
  failedPageCount: number;
  pages: TransformPageRecord[];
};

export type AgentDocsManifestPage = {
  id: string;
  title: string;
  sourceUrl: string;
  canonicalUrl: string;
  localMarkdownPath: string;
  localJsonlChunkIds: string[];
};

export type AgentDocsManifest = {
  generatedAt: string;
  pageCount: number;
  chunkCount: number;
  pages: AgentDocsManifestPage[];
};

export type ChunkReport = {
  chunkedAt: string;
  pageCount: number;
  chunkCount: number;
  pagesJsonlPath: string;
  chunksJsonlPath: string;
  manifestPath: string;
};

export type IndexReport = {
  indexedAt: string;
  pageCount: number;
  chunkCount: number;
  sqlitePath: string;
};

export type SnapshotDiffStatus = "new" | "changed" | "unchanged" | "removed";

export type SnapshotDiffPage = {
  id: string;
  status: SnapshotDiffStatus;
  previousContentHash?: string;
  currentContentHash?: string;
};

export type SnapshotDiffReport = {
  diffedAt: string;
  previousSnapshotId: string | null;
  pageCount: number;
  pages: SnapshotDiffPage[];
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

  createUseCasesDiscoveryDocumentCache() {
    const relativePath = "data/latest/discovery/openai-codex.use-cases.html";

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

  getRawHtmlRelativePath(sourceUrl: string): string {
    const normalized = normalizeCodexPageUrl(sourceUrl);
    return toPortablePath(path.posix.join("data", "latest", "raw-html", `${normalized.id}.html`));
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

  createRawHtmlCache(sourceUrl: string) {
    const relativePath = this.getRawHtmlRelativePath(sourceUrl);

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

  async copyLatestRawHtmlToSnapshot(sourceUrl: string, snapshotId: string): Promise<string> {
    const latestRelativePath = this.getRawHtmlRelativePath(sourceUrl);
    const content = await this.readText(latestRelativePath);
    const normalized = normalizeCodexPageUrl(sourceUrl);
    const snapshotRelativePath = toPortablePath(path.posix.join("data", "snapshots", snapshotId, "raw-html", `${normalized.id}.html`));
    await this.writeText(snapshotRelativePath, content);
    return snapshotRelativePath;
  }

  async writeFetchReport(report: FetchReport, snapshotId: string): Promise<void> {
    await this.writeJson("data/latest/metadata/openai-codex.fetch.json", report);
    await this.writeJson(`data/snapshots/${snapshotId}/metadata/openai-codex.fetch.json`, report);
  }

  async readLatestFetchReport(): Promise<FetchReport> {
    return this.readJson<FetchReport>("data/latest/metadata/openai-codex.fetch.json");
  }

  async fetchReportExists(): Promise<boolean> {
    return this.fileExists("data/latest/metadata/openai-codex.fetch.json");
  }

  async readLatestRawMarkdown(markdownSourceUrl: string): Promise<string> {
    return this.readText(this.getRawMarkdownRelativePath(markdownSourceUrl));
  }

  async rawMarkdownExists(markdownSourceUrl: string): Promise<boolean> {
    return this.fileExists(this.getRawMarkdownRelativePath(markdownSourceUrl));
  }

  async readLatestRawHtml(sourceUrl: string): Promise<string> {
    return this.readText(this.getRawHtmlRelativePath(sourceUrl));
  }

  async rawHtmlExists(sourceUrl: string): Promise<boolean> {
    return this.fileExists(this.getRawHtmlRelativePath(sourceUrl));
  }

  async writeGeneratedMarkdown(localMarkdownPath: string, content: string): Promise<void> {
    await this.writeText(localMarkdownPath, content);
  }

  async readGeneratedMarkdown(localMarkdownPath: string): Promise<string> {
    return this.readText(localMarkdownPath);
  }

  async writeManifest(manifest: DocsManifest, snapshotId = createSnapshotId()): Promise<void> {
    await this.writeJson("data/latest/manifest.json", manifest);
    await this.writeJson(`data/snapshots/${snapshotId}/manifest.json`, manifest);
  }

  async readLatestManifest(): Promise<DocsManifest> {
    return this.readJson<DocsManifest>("data/latest/manifest.json");
  }

  async latestManifestExists(): Promise<boolean> {
    return this.fileExists("data/latest/manifest.json");
  }

  async writeTransformReport(report: TransformReport, snapshotId = createSnapshotId()): Promise<void> {
    await this.writeJson("data/latest/metadata/openai-codex.transform.json", report);
    await this.writeJson(`data/snapshots/${snapshotId}/metadata/openai-codex.transform.json`, report);
  }

  async writeAgentPageRecords(records: readonly AgentDocPageRecord[]): Promise<void> {
    await this.writeJsonl("generated/agent/docs.pages.jsonl", records);
  }

  async readAgentPageRecords(): Promise<AgentDocPageRecord[]> {
    return this.readJsonl<AgentDocPageRecord>("generated/agent/docs.pages.jsonl");
  }

  async agentPageRecordsExist(): Promise<boolean> {
    return this.fileExists("generated/agent/docs.pages.jsonl");
  }

  async writeAgentChunkRecords(records: readonly AgentDocChunkRecord[]): Promise<void> {
    await this.writeJsonl("generated/agent/docs.chunks.jsonl", records);
  }

  async readAgentChunkRecords(): Promise<AgentDocChunkRecord[]> {
    return this.readJsonl<AgentDocChunkRecord>("generated/agent/docs.chunks.jsonl");
  }

  async agentChunkRecordsExist(): Promise<boolean> {
    return this.fileExists("generated/agent/docs.chunks.jsonl");
  }

  async writeAgentDocsManifest(manifest: AgentDocsManifest): Promise<void> {
    await this.writeJson("generated/agent/docs.manifest.json", manifest);
  }

  async readAgentDocsManifest(): Promise<AgentDocsManifest> {
    return this.readJson<AgentDocsManifest>("generated/agent/docs.manifest.json");
  }

  async agentDocsManifestExists(): Promise<boolean> {
    return this.fileExists("generated/agent/docs.manifest.json");
  }

  async writeChunkReport(report: ChunkReport): Promise<void> {
    await this.writeJson("data/latest/metadata/openai-codex.chunk.json", report);
  }

  async writeIndexReport(report: IndexReport): Promise<void> {
    await this.writeJson("data/latest/metadata/openai-codex.index.json", report);
  }

  async writeValidationReport(report: unknown, snapshotId = createSnapshotId()): Promise<void> {
    await this.writeJson("data/latest/validation-report.json", report);
    await this.writeJson(`data/snapshots/${snapshotId}/validation-report.json`, report);
  }

  async writeDiffReport(report: SnapshotDiffReport, snapshotId = createSnapshotId()): Promise<void> {
    await this.writeJson("data/latest/diff.json", report);
    await this.writeJson(`data/snapshots/${snapshotId}/diff.json`, report);
  }

  async readPreviousSnapshotManifest(): Promise<{ snapshotId: string; manifest: DocsManifest } | null> {
    const snapshotIds = await this.listSnapshotIds();
    const latestManifest = await this.readLatestManifest().catch(() => null);
    const candidates: Array<{ snapshotId: string; manifest: DocsManifest }> = [];

    for (const snapshotId of snapshotIds) {
      const manifestPath = `data/snapshots/${snapshotId}/manifest.json`;
      if (!await this.fileExists(manifestPath)) {
        continue;
      }

      const manifest = await this.readJson<DocsManifest>(manifestPath);
      if (latestManifest !== null && manifest.generatedAt === latestManifest.generatedAt) {
        continue;
      }

      candidates.push({ snapshotId, manifest });
    }

    return candidates.at(-1) ?? null;
  }

  getSearchSqliteRelativePath(): string {
    return "generated/search/docs.sqlite";
  }

  async searchSqliteExists(): Promise<boolean> {
    return this.fileExists(this.getSearchSqliteRelativePath());
  }

  async generatedMarkdownExists(localMarkdownPath: string): Promise<boolean> {
    return this.fileExists(localMarkdownPath);
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

  private async writeJsonl(relativePath: string, records: readonly unknown[]): Promise<void> {
    await this.writeText(relativePath, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
  }

  private async readJsonl<T>(relativePath: string): Promise<T[]> {
    const content = await this.readText(relativePath);
    return content
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as T);
  }

  private async listSnapshotIds(): Promise<string[]> {
    try {
      const entries = await readdir(this.toAbsolutePath("data/snapshots"), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }
}

export function createSnapshotId(date = new Date()): string {
  return date.toISOString().replace(/[:.]/gu, "-");
}
