import { describe, expect, it } from "vitest";
import { slugifyHeading } from "./slug.js";

describe("slugifyHeading", () => {
  it("creates stable lowercase heading slugs", () => {
    expect(slugifyHeading("Codex CLI: Configuration")).toBe("codex-cli-configuration");
  });

  it("collapses duplicate whitespace and hyphens", () => {
    expect(slugifyHeading("  Use   Codex -- safely  ")).toBe("use-codex-safely");
  });
});
