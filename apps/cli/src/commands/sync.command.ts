import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerSyncCommand(program: Command): void {
  addCommonOptions(program.command("sync")
    .description("Run the full local documentation mirror pipeline."))
    .action(createPlaceholderAction({
      commandName: "sync",
      milestone: "Milestone 5",
      summary: "The full pipeline is intentionally out of Milestone 2 scope."
    }));
}
