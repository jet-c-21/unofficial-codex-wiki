import { describe, expect, it } from "vitest";
import { isSha256Hash, sha256 } from "../index.js";

describe("sha256", () => {
  it("returns PRD-style sha256 hashes", () => {
    const hash = sha256("codex");

    expect(isSha256Hash(hash)).toBe(true);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/u);
  });
});
