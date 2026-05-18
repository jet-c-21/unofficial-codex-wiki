import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DocStorage, createSnapshotId } from "./doc-storage.js";

describe("DocStorage", () => {
  it("writes discovery output to latest and snapshots", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-storage-"));
    try {
      const storage = new DocStorage({ projectRoot });
      await storage.writeDiscoveryOutput({
        source: "https://developers.openai.com/codex/llms.txt",
        discoveredAt: "2026-05-19T00:00:00.000Z",
        pageCount: 1,
        urls: ["https://developers.openai.com/codex/cli.md"]
      }, "snapshot-1");

      await expect(storage.readLatestDiscoveryOutput()).resolves.toMatchObject({
        pageCount: 1,
        urls: ["https://developers.openai.com/codex/cli.md"]
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("uses portable raw Markdown paths", () => {
    const storage = new DocStorage({ projectRoot: "/tmp/project" });

    expect(storage.getRawMarkdownRelativePath("https://developers.openai.com/codex/app/commands.md")).toBe("data/latest/raw-markdown/app/commands.md");
  });

  it("creates portable snapshot ids", () => {
    expect(createSnapshotId(new Date("2026-05-19T01:02:03.004Z"))).toBe("2026-05-19T01-02-03-004Z");
  });
});
