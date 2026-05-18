import { Command } from "commander";
import { createPipelineContext, runFetchStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerFetchCommand(program: Command): void {
  addCommonOptions(program.command("fetch")
    .description("Fetch Markdown pages and required documentation assets."))
    .action(async (options: CommonCliOptions) => {
      try {
        const report = await runFetchStep(createPipelineContext(toPipelineCommandOptions(options)));
        const fetchedCount = report.pages.filter((page) => page.status === "fetched").length;
        const cachedCount = report.pages.filter((page) => page.status === "cached").length;

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "fetch",
            report
          }, null, 2));
          return;
        }

        console.log(`Fetched ${fetchedCount} page(s); reused ${cachedCount} cached page(s).`);
        console.log(`Output: data/latest/raw-markdown/`);
        console.log(`Report: data/latest/metadata/openai-codex.fetch.json`);
      } catch (error) {
        printCommandError("fetch", error, options.json);
      }
    });
}
