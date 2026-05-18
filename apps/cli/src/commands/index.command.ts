import { Command } from "commander";
import { createPipelineContext, runIndexStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerIndexCommand(program: Command): void {
  addCommonOptions(program.command("index")
    .description("Build the local SQLite FTS5 search index."))
    .action(async (options: CommonCliOptions) => {
      try {
        const result = await runIndexStep(createPipelineContext(toPipelineCommandOptions(options)));

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "index",
            report: result.report
          }, null, 2));
          return;
        }

        console.log(`Indexed ${result.report.pageCount} page(s) and ${result.report.chunkCount} chunk(s).`);
        console.log(`SQLite: ${result.report.sqlitePath}`);
      } catch (error) {
        printCommandError("index", error, options.json);
      }
    });
}
