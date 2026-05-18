import { searchIndex, type SearchResult } from "@unofficial-codex-wiki/indexer";
import type { PipelineContext } from "../pipeline-context.js";

export type SearchStepInput = {
  query: string;
};

export type SearchStepResult = {
  results: SearchResult[];
};

export async function runSearchStep(context: PipelineContext, input: SearchStepInput): Promise<SearchStepResult> {
  if (!await context.storage.searchSqliteExists()) {
    throw new Error("Search index missing: generated/search/docs.sqlite is missing. Run docs:index first.");
  }

  const searchOptions = context.limit === undefined ? {} : { limit: context.limit };
  const results = searchIndex(
    context.storage.toAbsolutePath(context.storage.getSearchSqliteRelativePath()),
    input.query,
    searchOptions
  );

  return {
    results
  };
}
