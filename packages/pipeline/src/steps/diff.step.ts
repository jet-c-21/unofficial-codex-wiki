import { nowIsoDateTime } from "@unofficial-codex-wiki/core";
import type { DocsManifest, SnapshotDiffPage, SnapshotDiffReport } from "@unofficial-codex-wiki/storage";
import type { PipelineContext } from "../pipeline-context.js";
import { emitProgress } from "../progress.js";

export type DiffResult = {
  report: SnapshotDiffReport;
};

export async function runDiffStep(context: PipelineContext): Promise<DiffResult> {
  if (!await context.storage.latestManifestExists()) {
    throw new Error("Diff input missing: data/latest/manifest.json is missing. Run docs:transform first.");
  }

  emitProgress(context, {
    step: "diff",
    phase: "start",
    message: "Diffing latest manifest against previous snapshot"
  });

  const currentManifest = await context.storage.readLatestManifest();
  const previous = await context.storage.readPreviousSnapshotManifest();
  const pages = previous === null
    ? currentManifest.pages.map((page): SnapshotDiffPage => ({
      id: page.id,
      status: "new",
      currentContentHash: page.contentHash
    }))
    : diffManifests(previous.manifest, currentManifest);
  const report: SnapshotDiffReport = {
    diffedAt: nowIsoDateTime(),
    previousSnapshotId: previous?.snapshotId ?? null,
    pageCount: pages.length,
    pages
  };

  await context.storage.writeDiffReport(report);
  emitProgress(context, {
    step: "diff",
    phase: "complete",
    message: `Diffed ${report.pageCount} page(s)`,
    counts: countDiffStatuses(report.pages),
    outputPaths: ["data/latest/diff.json"]
  });
  return { report };
}

function diffManifests(previous: DocsManifest, current: DocsManifest): SnapshotDiffPage[] {
  const previousById = new Map(previous.pages.map((page) => [page.id, page]));
  const currentById = new Map(current.pages.map((page) => [page.id, page]));
  const pageIds = new Set([...previousById.keys(), ...currentById.keys()]);
  const pages: SnapshotDiffPage[] = [];

  for (const id of [...pageIds].sort()) {
    const previousPage = previousById.get(id);
    const currentPage = currentById.get(id);

    if (previousPage === undefined && currentPage !== undefined) {
      pages.push({
        id,
        status: "new",
        currentContentHash: currentPage.contentHash
      });
      continue;
    }

    if (previousPage !== undefined && currentPage === undefined) {
      pages.push({
        id,
        status: "removed",
        previousContentHash: previousPage.contentHash
      });
      continue;
    }

    if (previousPage !== undefined && currentPage !== undefined) {
      pages.push({
        id,
        status: previousPage.contentHash === currentPage.contentHash ? "unchanged" : "changed",
        previousContentHash: previousPage.contentHash,
        currentContentHash: currentPage.contentHash
      });
    }
  }

  return pages;
}

function countDiffStatuses(pages: readonly SnapshotDiffPage[]): Record<string, number> {
  const counts: Record<string, number> = {
    new: 0,
    changed: 0,
    unchanged: 0,
    removed: 0
  };

  for (const page of pages) {
    counts[page.status] = (counts[page.status] ?? 0) + 1;
  }

  return counts;
}
