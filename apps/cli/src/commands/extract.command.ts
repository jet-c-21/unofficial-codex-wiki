import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerExtractCommand(program: Command): void {
  addCommonOptions(program.command("extract")
    .description("Extract static HTML fallback content when required."))
    .action(createPlaceholderAction({
      commandName: "extract",
      milestone: "Milestone 3",
      summary: "HTML fallback extraction is intentionally out of Milestone 2 scope."
    }));
}
