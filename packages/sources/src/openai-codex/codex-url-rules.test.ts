import { describe, expect, it } from "vitest";
import { isAllowedCodexUrl, normalizeCodexPageUrl } from "./codex-url-rules.js";

describe("Codex URL rules", () => {
  it("accepts in-scope Codex page URLs", () => {
    expect(isAllowedCodexUrl("https://developers.openai.com/codex/cli.md")).toBe(true);
    expect(isAllowedCodexUrl("/codex/cli")).toBe(true);
    expect(isAllowedCodexUrl("/codex/app/commands.md")).toBe(true);
  });

  it("accepts support URLs only when explicitly requested", () => {
    expect(isAllowedCodexUrl("https://developers.openai.com/codex/llms.txt")).toBe(false);
    expect(isAllowedCodexUrl("https://developers.openai.com/codex/llms.txt", { includeSupport: true })).toBe(true);
  });

  it("rejects external and unrelated URLs", () => {
    expect(isAllowedCodexUrl("https://platform.openai.com/docs")).toBe(false);
    expect(isAllowedCodexUrl("https://developers.openai.com/chatgpt")).toBe(false);
  });

  it("normalizes page URLs to stable canonical and markdown URLs", () => {
    expect(normalizeCodexPageUrl("/codex/cli")).toMatchObject({
      id: "cli",
      canonicalUrl: "https://developers.openai.com/codex/cli",
      markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
      section: "cli"
    });

    expect(normalizeCodexPageUrl("https://developers.openai.com/codex/cli.md").canonicalUrl).toBe("https://developers.openai.com/codex/cli");
  });
});
