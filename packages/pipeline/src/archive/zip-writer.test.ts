import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectZipArchive, writeZipArchive } from "./zip-writer.js";

describe("zip writer", () => {
  it("writes an inspectable ZIP archive with expected entries", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-zip-"));
    try {
      const outputPath = path.join(projectRoot, "bundle.zip");
      await writeZipArchive(outputPath, [
        {
          path: "README.md",
          content: "# Bundle\n"
        },
        {
          path: "generated/agent/docs.pages.jsonl",
          content: "{}\n"
        }
      ]);

      const inspection = inspectZipArchive(await readFile(outputPath));
      expect(inspection.entryCount).toBe(2);
      expect([...inspection.entries].sort()).toEqual([
        "README.md",
        "generated/agent/docs.pages.jsonl"
      ]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("rejects empty or corrupt ZIP archives", () => {
    expect(() => inspectZipArchive(Buffer.alloc(0))).toThrow(/end-of-central-directory/u);
    expect(() => inspectZipArchive(Buffer.from("not a zip", "utf8"))).toThrow(/end-of-central-directory/u);
  });
});
