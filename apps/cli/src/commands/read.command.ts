import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerReadCommand(program: Command): void {
  addCommonOptions(program.command("read")
    .description("Read a local generated Markdown page or section.")
    .argument("<page-or-slug>", "page ID, slug, or local page reference"))
    .action((_pageOrSlug: string, options: { json?: boolean }) => {
      createPlaceholderAction({
        commandName: "read",
        milestone: "Milestone 4",
        summary: "Local read behavior is intentionally out of Milestone 3 scope."
      })(options);
    });
}
