import { Command } from "commander";
import { createPipelineContext, runChunkStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerChunkCommand(program: Command): void {
  addCommonOptions(program.command("chunk")
    .description("Create agent-friendly JSONL chunks from local Markdown."))
    .action(async (options: CommonCliOptions) => {
      try {
        const result = await runChunkStep(createPipelineContext(toPipelineCommandOptions(options)));

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "chunk",
            agentManifest: result.agentManifest,
            report: result.report
          }, null, 2));
          return;
        }

        console.log(`Wrote ${result.report.pageCount} page record(s) and ${result.report.chunkCount} chunk record(s).`);
        console.log("Pages: generated/agent/docs.pages.jsonl");
        console.log("Chunks: generated/agent/docs.chunks.jsonl");
        console.log("Manifest: generated/agent/docs.manifest.json");
      } catch (error) {
        printCommandError("chunk", error, options.json);
      }
    });
}
