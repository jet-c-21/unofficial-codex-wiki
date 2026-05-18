import { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createPipelineContext, runSyncStep, type PipelineProgressEvent, type SyncResult } from "@unofficial-codex-wiki/pipeline";
import { summarizeValidationIssues, type ValidationReport } from "@unofficial-codex-wiki/validator";
import { addCommonOptions } from "./not-implemented.js";
import { printCommandError, toPipelineCommandOptions, type CommonCliOptions } from "./options.js";

export function registerSyncCommand(program: Command): void {
  addCommonOptions(program.command("sync")
    .description("Run the full local documentation mirror pipeline."))
    .action(async (options: CommonCliOptions) => {
      let projectRoot = process.cwd();
      try {
        const pipelineOptions = toPipelineCommandOptions(options);
        projectRoot = pipelineOptions.projectRoot ?? projectRoot;
        if (options.json !== true) {
          pipelineOptions.onProgress = (event) => {
            console.log(formatSyncProgressEvent(event));
          };
        }

        const result = await runSyncStep(createPipelineContext(pipelineOptions));

        if (options.json === true) {
          console.log(JSON.stringify({
            ok: true,
            command: "sync",
            result
          }, null, 2));
          return;
        }

        for (const line of formatSyncSuccessSummary(result)) {
          console.log(line);
        }
      } catch (error) {
        if (options.json === true) {
          printCommandError("sync", error, true);
          return;
        }

        console.error(`sync failed: ${error instanceof Error ? error.message : String(error)}`);
        const report = readLatestValidationReport(projectRoot);
        if (report !== null && !report.ok) {
          for (const line of formatValidationFailureSummary(report)) {
            console.error(line);
          }
        }
        process.exitCode = 1;
      }
    });
}

export function formatSyncProgressEvent(event: PipelineProgressEvent): string {
  const prefix = `[${event.step}]`;

  if (event.step === "fetch" && event.phase === "progress" && event.current !== undefined && event.total !== undefined) {
    const elapsed = event.elapsedMs === undefined ? "" : `, elapsed ${formatDuration(event.elapsedMs)}`;
    const eta = event.estimatedRemainingMs === undefined ? "" : `, eta ${formatDuration(event.estimatedRemainingMs)}`;
    return `${prefix} ${event.current}/${event.total} ${event.item ?? "page"} ${event.status ?? "done"}${elapsed}${eta}`;
  }

  const outputs = event.outputPaths === undefined || event.outputPaths.length === 0
    ? ""
    : ` -> ${event.outputPaths.join(", ")}`;
  return `${prefix} ${event.message}${outputs}`;
}

export function formatSyncSuccessSummary(result: SyncResult): string[] {
  return [
    "",
    "Sync complete.",
    `Generated Markdown pages: ${result.transform.report.generatedPageCount}`,
    `Chunks: ${result.chunk.report.chunkCount}`,
    `Indexed chunks: ${result.index.report.chunkCount}`,
    `Validation: passed with ${result.validation.warningCount} warning(s)`,
    `Diff pages: ${result.diff.pageCount}`,
    "Outputs:",
    "  data/latest/manifest.json",
    "  generated/markdown/codex/",
    "  generated/agent/docs.pages.jsonl",
    "  generated/agent/docs.chunks.jsonl",
    "  generated/agent/docs.manifest.json",
    "  generated/search/docs.sqlite",
    "  data/latest/validation-report.json",
    "  data/latest/diff.json"
  ];
}

export function formatValidationFailureSummary(report: ValidationReport): string[] {
  const lines = [
    `Validation report: data/latest/validation-report.json`,
    `Validation summary: ${report.errorCount} error(s), ${report.warningCount} warning(s)`
  ];

  for (const summary of summarizeValidationIssues(report, 5)) {
    const examplePath = summary.examplePaths[0] === undefined ? "" : `; example: ${summary.examplePaths[0]}`;
    lines.push(`  - ${summary.code}: ${summary.count} ${summary.severity}(s)${examplePath}`);
    if (summary.exampleMessages[0] !== undefined) {
      lines.push(`    ${summary.exampleMessages[0]}`);
    }
  }

  return lines;
}

function readLatestValidationReport(projectRoot: string): ValidationReport | null {
  const reportPath = path.resolve(projectRoot, "data/latest/validation-report.json");
  if (!existsSync(reportPath)) {
    return null;
  }

  return JSON.parse(readFileSync(reportPath, "utf8")) as ValidationReport;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
