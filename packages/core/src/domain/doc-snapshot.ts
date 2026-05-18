import type { IsoDateTime } from "./doc-page.js";

export type SnapshotId = string;

export type DocSnapshot = {
  id: SnapshotId;
  createdAt: IsoDateTime;
  manifestPath: string;
};
