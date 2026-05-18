import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export type TempDir = {
  path: string;
  cleanup: () => Promise<void>;
};

export async function createTempDir(prefix = "unofficial-codex-wiki-"): Promise<TempDir> {
  const tempPath = await mkdtemp(path.join(tmpdir(), prefix));

  return {
    path: tempPath,
    cleanup: async () => {
      await rm(tempPath, { force: true, recursive: true });
    }
  };
}
