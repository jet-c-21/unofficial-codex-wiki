import { Command } from "commander";
import { addCommonOptions, createPlaceholderAction } from "./not-implemented.js";

export function registerChunkCommand(program: Command): void {
  addCommonOptions(program.command("chunk")
    .description("Create agent-friendly JSONL chunks from local Markdown."))
    .action(createPlaceholderAction({
      commandName: "chunk",
      milestone: "Milestone 4",
      summary: "Chunking is intentionally out of Milestone 3 scope."
    }));
}
