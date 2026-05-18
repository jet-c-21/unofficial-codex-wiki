import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerIndexCommand(program: Command): void {
  addCommonOptions(program.command("index")
    .description("Build the local SQLite FTS5 search index."))
    .action(createPlaceholderAction({
      commandName: "index",
      milestone: "Milestone 4",
      summary: "Search indexing is intentionally out of Milestone 3 scope."
    }));
}
