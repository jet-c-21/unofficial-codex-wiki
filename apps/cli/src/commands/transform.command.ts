import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerTransformCommand(program: Command): void {
  addCommonOptions(program.command("transform")
    .description("Normalize Markdown, add metadata, and rewrite local links."))
    .action(createPlaceholderAction({
      commandName: "transform",
      milestone: "Milestone 3",
      summary: "Markdown transformation is intentionally out of Milestone 2 scope."
    }));
}
