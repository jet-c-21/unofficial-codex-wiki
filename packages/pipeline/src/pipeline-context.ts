import type { CacheMode, CrawlerPolicy, CrawlerPolicyOverrides, CrawlerProfile } from "@unofficial-codex-wiki/config";
import { loadCrawlerPolicy } from "@unofficial-codex-wiki/config";
import type { DelayFunction, HttpFetchClient } from "@unofficial-codex-wiki/crawler";
import { DocStorage } from "@unofficial-codex-wiki/storage";

export type PipelineCommandOptions = {
  profile?: CrawlerProfile;
  cacheMode?: CacheMode;
  offline?: boolean;
  force?: boolean;
  limit?: number;
  projectRoot?: string;
  httpClient?: HttpFetchClient;
  delay?: DelayFunction;
  onProgress?: PipelineProgressListener;
};

export type PipelineStepName =
  | "sync"
  | "discover"
  | "fetch"
  | "transform"
  | "chunk"
  | "index"
  | "validate"
  | "diff"
  | "export";

export type PipelineProgressPhase = "start" | "progress" | "complete" | "failed";

export type PipelineProgressEvent = {
  step: PipelineStepName;
  phase: PipelineProgressPhase;
  message: string;
  current?: number;
  total?: number;
  item?: string;
  status?: string;
  elapsedMs?: number;
  estimatedRemainingMs?: number;
  counts?: Record<string, number>;
  outputPaths?: string[];
};

export type PipelineProgressListener = (event: PipelineProgressEvent) => void;

export type PipelineContext = {
  policy: CrawlerPolicy;
  storage: DocStorage;
  httpClient?: HttpFetchClient;
  delay?: DelayFunction;
  limit?: number;
  onProgress?: PipelineProgressListener;
};

export function createPipelineContext(options: PipelineCommandOptions = {}): PipelineContext {
  const cliOverrides: CrawlerPolicyOverrides = {};

  if (options.profile !== undefined) {
    cliOverrides.profile = options.profile;
  }

  if (options.cacheMode !== undefined) {
    cliOverrides.cacheMode = options.cacheMode;
  }

  if (options.offline === true) {
    cliOverrides.profile = "offline";
    cliOverrides.cacheMode = "offline";
    cliOverrides.allowNetworkRequests = false;
  }

  if (options.force === true && options.offline !== true) {
    cliOverrides.cacheMode = "force";
  }

  const storageOptions: { projectRoot?: string } = {};
  if (options.projectRoot !== undefined) {
    storageOptions.projectRoot = options.projectRoot;
  }

  const context: PipelineContext = {
    policy: loadCrawlerPolicy({ cliOverrides }),
    storage: new DocStorage(storageOptions)
  };

  if (options.httpClient !== undefined) {
    context.httpClient = options.httpClient;
  }

  if (options.delay !== undefined) {
    context.delay = options.delay;
  }

  if (options.limit !== undefined) {
    context.limit = options.limit;
  }

  if (options.onProgress !== undefined) {
    context.onProgress = options.onProgress;
  }

  return context;
}
