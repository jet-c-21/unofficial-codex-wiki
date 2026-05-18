import type { DocSnapshot } from "@unofficial-codex-wiki/core";

export function createSnapshotFixture(overrides: Partial<DocSnapshot> = {}): DocSnapshot {
  return {
    id: "2026-05-18T00-00-00-000Z",
    createdAt: "2026-05-18T00:00:00.000Z",
    manifestPath: "data/snapshots/2026-05-18T00-00-00-000Z/manifest.json",
    ...overrides
  };
}
