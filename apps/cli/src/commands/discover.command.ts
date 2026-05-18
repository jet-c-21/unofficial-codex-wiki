import { Command } from "commander";
import { createPipelineContext, runDiscoverStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerDiscoverCommand(program: Command): void {
  addCommonOptions(program.command("discover")
    .description("Discover in-scope Codex documentation URLs from /codex/llms.txt."))
    .action(async (options: CommonCliOptions) => {
      try {
        const result = await runDiscoverStep(createPipelineContext(toPipelineCommandOptions(options)));

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "discover",
            fromCache: result.fromCache,
            discovery: result.discovery
          }, null, 2));
          return;
        }

        console.log(`Discovered ${result.discovery.pageCount} Codex documentation page(s).`);
        console.log(`Source: ${result.discovery.source}`);
        console.log(`Output: data/latest/discovery/openai-codex.urls.json`);
        console.log(`Cache: ${result.fromCache ? "used" : "refreshed"}`);
      } catch (error) {
        printCommandError("discover", error, options.json);
      }
    });
}
