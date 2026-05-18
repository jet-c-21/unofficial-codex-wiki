export function normalizeMarkdownBody(markdown: string): string {
  const withoutBom = markdown.replace(/^\uFEFF/u, "");
  const normalizedLineEndings = withoutBom.replace(/\r\n?/gu, "\n");
  return `${normalizedLineEndings.replace(/\s*$/u, "")}\n`;
}
