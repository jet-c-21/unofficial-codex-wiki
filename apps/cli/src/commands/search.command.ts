import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerSearchCommand(program: Command): void {
  addCommonOptions(program.command("search")
    .description("Search the local SQLite FTS5 documentation index.")
    .argument("<query>", "search query"))
    .action((_query: string, options: { json?: boolean }) => {
      createPlaceholderAction({
        commandName: "search",
        milestone: "Milestone 4",
        summary: "Local search is intentionally out of Milestone 2 scope."
      })(options);
    });
}
