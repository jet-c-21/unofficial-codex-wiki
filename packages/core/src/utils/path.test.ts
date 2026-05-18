import { describe, expect, it } from "vitest";
import {
  isProjectRelativePath,
  joinPortablePath,
  normalizeProjectRelativePath,
  toPortablePath
} from "./path.js";

describe("portable path utilities", () => {
  it("normalizes separators to forward slashes", () => {
    expect(toPortablePath("generated\\markdown\\codex\\cli.md")).toBe("generated/markdown/codex/cli.md");
  });

  it("joins path segments as portable project metadata paths", () => {
    expect(joinPortablePath("generated", "markdown", "codex", "cli.md")).toBe("generated/markdown/codex/cli.md");
  });

  it("normalizes POSIX absolute paths relative to the project root", () => {
    expect(normalizeProjectRelativePath("/repo/generated/markdown/codex/cli.md", "/repo")).toBe("generated/markdown/codex/cli.md");
  });

  it("normalizes Windows absolute paths relative to the project root", () => {
    expect(normalizeProjectRelativePath("C:\\repo\\generated\\markdown\\codex\\cli.md", "C:\\repo")).toBe("generated/markdown/codex/cli.md");
  });

  it("identifies portable project-relative paths", () => {
    expect(isProjectRelativePath("generated/agent/docs.pages.jsonl")).toBe(true);
    expect(isProjectRelativePath("../outside")).toBe(false);
    expect(isProjectRelativePath("C:\\repo\\secret.txt")).toBe(false);
  });
});
