import { openAiCodexSourceConfig } from "@unofficial-codex-wiki/config";
import { createCodexDiscoveryOutput } from "./codex-url-discovery.js";

export const openAiCodexSourceAdapter = {
  ...openAiCodexSourceConfig,
  createDiscoveryOutput: createCodexDiscoveryOutput
} as const;
