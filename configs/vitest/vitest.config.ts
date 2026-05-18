import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const configDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(configDir, "../..");

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@unofficial-codex-wiki/chunker": resolve(rootDir, "packages/chunker/src/index.ts"),
      "@unofficial-codex-wiki/config": resolve(rootDir, "packages/config/src/index.ts"),
      "@unofficial-codex-wiki/core": resolve(rootDir, "packages/core/src/index.ts"),
      "@unofficial-codex-wiki/crawler": resolve(rootDir, "packages/crawler/src/index.ts"),
      "@unofficial-codex-wiki/extractor": resolve(rootDir, "packages/extractor/src/index.ts"),
      "@unofficial-codex-wiki/indexer": resolve(rootDir, "packages/indexer/src/index.ts"),
      "@unofficial-codex-wiki/logger": resolve(rootDir, "packages/logger/src/index.ts"),
      "@unofficial-codex-wiki/pipeline": resolve(rootDir, "packages/pipeline/src/index.ts"),
      "@unofficial-codex-wiki/sources": resolve(rootDir, "packages/sources/src/index.ts"),
      "@unofficial-codex-wiki/storage": resolve(rootDir, "packages/storage/src/index.ts"),
      "@unofficial-codex-wiki/testing": resolve(rootDir, "packages/testing/src/index.ts"),
      "@unofficial-codex-wiki/transformer": resolve(rootDir, "packages/transformer/src/index.ts"),
      "@unofficial-codex-wiki/validator": resolve(rootDir, "packages/validator/src/index.ts")
    }
  }
});
