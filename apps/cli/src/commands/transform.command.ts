import { Command } from "commander";
import { createPipelineContext, runTransformStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerTransformCommand(program: Command): void {
  addCommonOptions(program.command("transform")
    .description("Normalize Markdown, add metadata, and rewrite local links."))
    .action(async (options: CommonCliOptions) => {
      try {
        const result = await runTransformStep(createPipelineContext(toPipelineCommandOptions(options)));

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "transform",
            manifest: result.manifest,
            report: result.report
          }, null, 2));
          return;
        }

        console.log(`Generated ${result.report.generatedPageCount} Markdown page(s).`);
        console.log("Output: generated/markdown/codex/");
        console.log("Manifest: data/latest/manifest.json");
        console.log("Report: data/latest/metadata/openai-codex.transform.json");
      } catch (error) {
        printCommandError("transform", error, options.json);
      }
    });
}
