import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerExtractCommand(program: Command): void {
  addCommonOptions(program.command("extract")
    .description("Extract static HTML fallback content when required."))
    .action(createPlaceholderAction({
      commandName: "extract",
      milestone: "Milestone 3",
      summary: "HTML fallback extraction remains deferred until a Markdown fetch failure requires it."
    }));
}
