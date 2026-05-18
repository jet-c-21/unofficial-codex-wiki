import pino, { type Logger, type LoggerOptions } from "pino";
import { defaultLogLevel, type LogLevel } from "./log-level.js";

export type CreateLoggerOptions = {
  level?: LogLevel;
  name?: string;
};

const defaultRedactions = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "env.*KEY*",
  "env.*TOKEN*",
  "env.*SECRET*"
] as const;

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const loggerOptions: LoggerOptions = {
    level: options.level ?? defaultLogLevel,
    name: options.name ?? "unofficial-codex-wiki",
    redact: {
      paths: [...defaultRedactions],
      remove: true
    }
  };

  return pino(loggerOptions);
}

export const rootLogger = createLogger();
