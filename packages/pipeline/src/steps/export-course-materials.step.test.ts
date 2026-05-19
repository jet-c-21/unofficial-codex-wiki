import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DocStorage } from "@unofficial-codex-wiki/storage";
import { createPipelineContext } from "../pipeline-context.js";
import { runChunkStep } from "./chunk.step.js";
import { formatExportCourseMaterialsValidationFailure, inspectGeneratedOutputHealth, runExportCourseMaterialsStep } from "./export-course-materials.step.js";
import { runIndexStep } from "./index.step.js";

describe("export course materials step", () => {
  it("creates a private course-materials ZIP with agent instructions", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-export-course-"));
    try {
      const storage = new DocStorage({ projectRoot });
      await storage.writeDiscoveryOutput({
        source: "https://developers.openai.com/codex/llms.txt",
        discoveredAt: "2026-05-19T00:00:00.000Z",
        pageCount: 1,
        urls: ["https://developers.openai.com/codex/cli.md"]
      }, "snapshot-discovery");

      await storage.writeGeneratedMarkdown("generated/markdown/codex/cli.md", [
        "---",
        'title: "Codex CLI"',
        'description: "Terminal client for local Codex work."',
        'source_url: "https://developers.openai.com/codex/cli"',
        'canonical_url: "https://developers.openai.com/codex/cli"',
        'local_path: "generated/markdown/codex/cli.md"',
        'fetched_at: "2026-05-19T00:00:00.000Z"',
        'content_hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111"',
        'generated_by: "unofficial-codex-wiki"',
        "unofficial_local_mirror: true",
        "---",
        "# Codex CLI",
        "",
        "> Terminal client for local Codex work.",
        "",
        "Codex helps with repo-grounded coding work.",
        "",
        "## Practice",
        "",
        "Ask Codex to inspect files before editing."
      ].join("\n"));

      await storage.writeManifest({
        generatedAt: "2026-05-19T00:00:00.000Z",
        source: "https://developers.openai.com/codex/llms.txt",
        pageCount: 1,
        pages: [{
          id: "cli",
          title: "Codex CLI",
          description: "Terminal client for local Codex work.",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          localJsonlChunkIds: [],
          contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          fetchedAt: "2026-05-19T00:00:00.000Z",
          status: "new"
        }]
      }, "snapshot-transform");

      const context = createPipelineContext({ projectRoot });
      await runChunkStep(context);
      await runIndexStep(context);

      const result = await runExportCourseMaterialsStep(context, {
        name: "Training Bundle"
      });
      const zipContent = await readFile(storage.toAbsolutePath(result.outputPath));

      expect(result.outputPath).toMatch(/^generated\/exports\/training-bundle__ai-course-builder__private-local-mirror__/u);
      expect(result.entryCount).toBeGreaterThanOrEqual(8);
      expect(zipContent.readUInt32LE(0)).toBe(0x04034b50);
      expect(zipContent.includes(Buffer.from("AGENT_COURSE_CREATION_PROMPT.md"))).toBe(true);
      expect(zipContent.includes(Buffer.from("COURSE_MATERIALS_MANIFEST.json"))).toBe(true);
      expect(zipContent.includes(Buffer.from("generated/agent/docs.chunks.jsonl"))).toBe(true);
      expect(zipContent.includes(Buffer.from("generated/markdown/codex/cli.md"))).toBe(true);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("formats validation failures with generated-output health and recovery commands", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "codex-wiki-export-course-broken-"));
    try {
      const storage = new DocStorage({ projectRoot });
      await storage.writeGeneratedMarkdown("generated/markdown/codex/cli.md", "");
      await storage.writeManifest({
        generatedAt: "2026-05-19T00:00:00.000Z",
        source: "https://developers.openai.com/codex/llms.txt",
        pageCount: 1,
        pages: [{
          id: "cli",
          title: "Codex CLI",
          sourceUrl: "https://developers.openai.com/codex/cli",
          canonicalUrl: "https://developers.openai.com/codex/cli",
          markdownSourceUrl: "https://developers.openai.com/codex/cli.md",
          localMarkdownPath: "generated/markdown/codex/cli.md",
          localJsonlChunkIds: [],
          contentHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          fetchedAt: "2026-05-19T00:00:00.000Z",
          status: "new"
        }]
      }, "snapshot-transform");
      await mkdir(storage.toAbsolutePath("generated/agent"), { recursive: true });
      await writeFile(storage.toAbsolutePath("generated/agent/docs.pages.jsonl"), "");
      await writeFile(storage.toAbsolutePath("generated/agent/docs.chunks.jsonl"), "");
      await mkdir(storage.toAbsolutePath("generated/search"), { recursive: true });
      await writeFile(storage.toAbsolutePath("generated/search/docs.sqlite"), "");

      const health = await inspectGeneratedOutputHealth(createPipelineContext({ projectRoot }));
      const lines = formatExportCourseMaterialsValidationFailure({
        validatedAt: "2026-05-19T00:00:00.000Z",
        ok: false,
        errorCount: 3,
        warningCount: 0,
        checks: [{
          name: "coverage",
          ok: false,
          issues: [{
            code: "missing-jsonl-page",
            severity: "error",
            message: "JSONL page record is missing for page: cli",
            path: "generated/agent/docs.pages.jsonl"
          }]
        }]
      }, health);

      expect(lines.join("\n")).toContain("generated mirror validation failed with 3 error(s)");
      expect(lines.join("\n")).toContain("generated/agent/docs.pages.jsonl: empty");
      expect(lines.join("\n")).toContain("empty generated Markdown files: 1");
      expect(lines.join("\n")).toContain("missing-jsonl-page");
      expect(lines.join("\n")).toContain("pnpm docs:sync");
      expect(lines.join("\n")).toContain("pnpm docs:export-course-materials");
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
