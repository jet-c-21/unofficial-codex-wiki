import { Command } from "commander";
import { createPipelineContext, runSyncStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerSyncCommand(program: Command): void {
  addCommonOptions(program.command("sync")
    .description("Run the full local documentation mirror pipeline."))
    .action(async (options: CommonCliOptions) => {
      try {
        const result = await runSyncStep(createPipelineContext(toPipelineCommandOptions(options)));

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "sync",
            result
          }, null, 2));
          return;
        }

        console.log(`Synced ${result.transform.report.generatedPageCount} generated Markdown page(s).`);
        console.log(`Chunked ${result.chunk.report.chunkCount} chunk(s).`);
        console.log(`Indexed ${result.index.report.chunkCount} chunk(s).`);
        console.log(`Validation passed with ${result.validation.warningCount} warning(s).`);
        console.log(`Diff pages: ${result.diff.pageCount}`);
      } catch (error) {
        printCommandError("sync", error, options.json);
      }
    });
}
