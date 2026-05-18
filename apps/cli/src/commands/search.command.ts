import { Command } from "commander";
import { createPipelineContext, runSearchStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerSearchCommand(program: Command): void {
  addCommonOptions(program.command("search")
    .description("Search the local SQLite FTS5 documentation index.")
    .argument("<query>", "search query"))
    .action(async (query: string, options: CommonCliOptions) => {
      try {
        const result = await runSearchStep(createPipelineContext(toPipelineCommandOptions(options)), { query });

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "search",
            query,
            results: result.results
          }, null, 2));
          return;
        }

        if (result.results.length === 0) {
          console.log("No results.");
          return;
        }

        for (const [index, searchResult] of result.results.entries()) {
          console.log(`${index + 1}. ${searchResult.title}`);
          console.log(`   ${searchResult.snippet}`);
          console.log(`   Source: ${searchResult.sourceUrl}`);
          console.log(`   Local: ${searchResult.localMarkdownPath}`);
          if (searchResult.headingPath.length > 0) {
            console.log(`   Heading: ${searchResult.headingPath.join(" > ")}`);
          }
          console.log(`   Chunk: ${searchResult.chunkId}`);
        }
      } catch (error) {
        printCommandError("search", error, options.json);
      }
    });
}
