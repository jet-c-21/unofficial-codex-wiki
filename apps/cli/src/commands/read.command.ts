import { Command } from "commander";
import { createPipelineContext, runReadStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerReadCommand(program: Command): void {
  addCommonOptions(program.command("read")
    .description("Read a local generated Markdown page or section.")
    .argument("<page-or-slug>", "page ID, slug, or local page reference"))
    .action(async (pageOrSlug: string, options: CommonCliOptions) => {
      try {
        const result = await runReadStep(createPipelineContext(toPipelineCommandOptions(options)), { pageOrSlug });

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "read",
            page: result.page,
            content: result.content
          }, null, 2));
          return;
        }

        console.log(result.content);
      } catch (error) {
        printCommandError("read", error, options.json);
      }
    });
}
