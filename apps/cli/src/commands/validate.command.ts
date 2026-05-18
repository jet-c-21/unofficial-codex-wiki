import { Command } from "commander";
import { createPipelineContext, runValidateStep } from "@unofficial-codex-wiki/pipeline";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerValidateCommand(program: Command): void {
  addCommonOptions(program.command("validate")
    .description("Validate generated mirror outputs and crawler policy."))
    .action(async (options: CommonCliOptions) => {
      try {
        const result = await runValidateStep(createPipelineContext(toPipelineCommandOptions(options)));

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: result.report.ok,
            command: "validate",
            report: result.report
          }, null, 2));
        } else {
          console.log(`Validation ${result.report.ok ? "passed" : "failed"} with ${result.report.errorCount} error(s) and ${result.report.warningCount} warning(s).`);
          console.log("Report: data/latest/validation-report.json");
        }

        if (!result.report.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        printCommandError("validate", error, options.json);
      }
    });
}
