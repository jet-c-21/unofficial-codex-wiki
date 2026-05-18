import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerValidateCommand(program: Command): void {
  addCommonOptions(program.command("validate")
    .description("Validate generated mirror outputs and crawler policy."))
    .action(createPlaceholderAction({
      commandName: "validate",
      milestone: "Milestone 5",
      summary: "Output validation is intentionally out of Milestone 3 scope."
    }));
}
