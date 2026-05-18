import path from "node:path";

export function toPortablePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/").replace(/\/+/gu, "/");
}

export function joinPortablePath(...segments: string[]): string {
  return toPortablePath(path.posix.join(...segments.map(toPortablePath)));
}

export function normalizeProjectRelativePath(pathValue: string, projectRoot = process.cwd()): string {
  const relativePath = toRelativePath(pathValue, projectRoot);
  const normalized = toPortablePath(path.normalize(relativePath));
  return normalized.replace(/^\.\//u, "");
}

export function isProjectRelativePath(pathValue: string): boolean {
  const portablePath = toPortablePath(pathValue);
  return !isAbsolutePath(pathValue) && !portablePath.startsWith("../") && portablePath !== "..";
}

function toRelativePath(pathValue: string, projectRoot: string): string {
  if (path.win32.isAbsolute(pathValue) || path.win32.isAbsolute(projectRoot)) {
    return path.win32.isAbsolute(pathValue) ? path.win32.relative(projectRoot, pathValue) : pathValue;
  }

  return path.isAbsolute(pathValue) ? path.relative(projectRoot, pathValue) : pathValue;
}

function isAbsolutePath(pathValue: string): boolean {
  return path.isAbsolute(pathValue) || path.win32.isAbsolute(pathValue);
}
