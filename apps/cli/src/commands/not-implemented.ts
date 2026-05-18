import type { Command } from "commander";

export type MilestonePlaceholder = {
  commandName: string;
  milestone: string;
  summary: string;
};

export function addCommonOptions(command: Command): Command {
  return command
    .option("--profile <profile>", "crawler profile: offline, safe, or balanced")
    .option("--cache-mode <mode>", "cache mode: prefer-cache, refresh, force, or offline")
    .option("--offline", "use offline mode")
    .option("--force", "force a refresh when the command supports it")
    .option("--snapshot <timestamp>", "read from a specific snapshot")
    .option("--limit <number>", "limit command work or output")
    .option("--json", "print JSON output")
    .option("--verbose", "print verbose output");
}

export function createPlaceholderAction(placeholder: MilestonePlaceholder) {
  return (options: { json?: boolean } = {}) => {
    const message = `${placeholder.commandName} is a ${placeholder.milestone} command and is not implemented yet. ${placeholder.summary}`;

    if (options.json === true) {
      console.log(JSON.stringify({
        command: placeholder.commandName,
        implemented: false,
        milestone: placeholder.milestone,
        message,
        networkRequestsMade: false,
        generatedOutputCreated: false
      }));
    } else {
      console.error(message);
      console.error("No network requests were made and no generated mirror output was created.");
    }

    process.exitCode = 1;
  };
}
