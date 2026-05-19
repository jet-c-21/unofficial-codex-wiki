import { Command } from "commander";
import { openAiCodexSourceConfig, safeCrawlerPolicy } from "@unofficial-codex-wiki/config";
import { createLogger } from "@unofficial-codex-wiki/logger";
import { registerChunkCommand } from "./commands/chunk.command.js";
import { registerDiscoverCommand } from "./commands/discover.command.js";
import { registerExportCourseMaterialsCommand } from "./commands/export-course-materials.command.js";
import { registerExtractCommand } from "./commands/extract.command.js";
import { registerFetchCommand } from "./commands/fetch.command.js";
import { registerIndexCommand } from "./commands/index.command.js";
import { registerReadCommand } from "./commands/read.command.js";
import { registerSearchCommand } from "./commands/search.command.js";
import { registerSyncCommand } from "./commands/sync.command.js";
import { registerTransformCommand } from "./commands/transform.command.js";
import { registerValidateCommand } from "./commands/validate.command.js";

export function createCli(): Command {
  const logger = createLogger({ name: "codex-wiki" });

  logger.debug({
    crawlerProfile: safeCrawlerPolicy.profile,
    sourceRoot: openAiCodexSourceConfig.rootUrl
  }, "created CLI skeleton");

  const program = new Command();

  program
    .name("codex-wiki")
    .description("Private local Codex documentation mirror CLI.")
    .version("0.0.0");

  registerDiscoverCommand(program);
  registerExportCourseMaterialsCommand(program);
  registerFetchCommand(program);
  registerExtractCommand(program);
  registerTransformCommand(program);
  registerChunkCommand(program);
  registerIndexCommand(program);
  registerSearchCommand(program);
  registerReadCommand(program);
  registerValidateCommand(program);
  registerSyncCommand(program);

  return program;
}
