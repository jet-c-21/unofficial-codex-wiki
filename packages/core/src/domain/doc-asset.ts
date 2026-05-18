import type { Sha256Hash } from "./content-hash.js";

export type DocAsset = {
  originalUrl: string;
  localPath: string;
  contentHash: Sha256Hash;
  mediaType?: string;
};
