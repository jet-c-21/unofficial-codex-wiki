import { Command } from "commander";
import {
  createPipelineContext,
  ExportCourseMaterialsValidationError,
  formatExportCourseMaterialsValidationFailure,
  runExportCourseMaterialsStep
} from "@unofficial-codex-wiki/pipeline";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

type ExportCourseMaterialsCliOptions = CommonCliOptions & {
  name?: string;
  output?: string;
};

export function registerExportCourseMaterialsCommand(program: Command): void {
  program.command("export-course-materials")
    .description("Create a private AI-agent course-materials ZIP from generated local Codex docs.")
    .option("--name <name>", "human-facing course materials name", "Codex Course Materials")
    .option("--output <path>", "project-relative output ZIP path")
    .option("--json", "print JSON output")
    .action(async (options: ExportCourseMaterialsCliOptions) => {
      try {
        const input: { name?: string; output?: string } = {};
        if (options.name !== undefined) {
          input.name = options.name;
        }
        if (options.output !== undefined) {
          input.output = options.output;
        }

        const result = await runExportCourseMaterialsStep(
          createPipelineContext(toPipelineCommandOptions(options)),
          input
        );

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "export-course-materials",
            result
          }, null, 2));
          return;
        }

        console.log(`Exported ${result.name}.`);
        console.log(`ZIP: ${result.outputPath}`);
        console.log(`Files: ${result.entryCount}`);
        console.log(`Pages: ${result.pageCount}`);
        console.log(`Chunks: ${result.chunkCount}`);
        console.log(`Validation: passed with ${result.validation.warningCount} warning(s).`);
        console.log("Instructions: README.md and AGENT_COURSE_CREATION_PROMPT.md are included inside the ZIP.");
      } catch (error) {
        if (error instanceof ExportCourseMaterialsValidationError) {
          const lines = formatExportCourseMaterialsValidationFailure(error.report, error.health);
          if (options.json === true) {
            console.log(JSON.stringify({
              ok: false,
              command: "export-course-materials",
              error: error.message,
              validation: {
                ok: error.report.ok,
                errorCount: error.report.errorCount,
                warningCount: error.report.warningCount
              },
              health: error.health,
              recoveryCommands: [
                "pnpm docs:sync",
                "pnpm docs:export-course-materials"
              ],
              message: lines
            }, null, 2));
          } else {
            for (const line of lines) {
              console.error(line);
            }
          }
          process.exitCode = 1;
          return;
        }

        printCommandError("export-course-materials", error, options.json);
      }
    });
}
