import { normalizeCodexPageUrl } from "./codex-url-rules.js";

export function getCodexSection(input: string): string | undefined {
  return normalizeCodexPageUrl(input).section;
}
