export function parseFrontMatter(markdown: string): Record<string, string | boolean> {
  if (!markdown.startsWith("---\n")) {
    return {};
  }

  const endIndex = markdown.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return {};
  }

  const frontMatter: Record<string, string | boolean> = {};
  const body = markdown.slice(4, endIndex);

  for (const line of body.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (key.length === 0) {
      continue;
    }

    if (rawValue === "true") {
      frontMatter[key] = true;
      continue;
    }

    if (rawValue === "false") {
      frontMatter[key] = false;
      continue;
    }

    frontMatter[key] = rawValue.replace(/^"|"$/gu, "").replace(/\\"/gu, "\"").replace(/\\\\/gu, "\\");
  }

  return frontMatter;
}
