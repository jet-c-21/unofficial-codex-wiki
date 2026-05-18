export type HtmlToMarkdownInput = {
  html: string;
  sourceUrl: string;
};

export function htmlToMarkdown(input: HtmlToMarkdownInput): string {
  const content = extractMainContent(input.html);
  const markdown = convertHtmlFragmentToMarkdown(cleanHtmlForMarkdown(content));
  const normalized = normalizeMarkdownWhitespace(markdown);

  if (/^#\s+/mu.test(normalized)) {
    return normalized;
  }

  const fallbackTitle = extractHtmlTitle(input.html) ?? input.sourceUrl;
  return `# ${fallbackTitle}\n\n${normalized}`.trimEnd() + "\n";
}

function extractMainContent(html: string): string {
  return /<main\b[^>]*>([\s\S]*?)<\/main>/iu.exec(html)?.[1] ?? /<body\b[^>]*>([\s\S]*?)<\/body>/iu.exec(html)?.[1] ?? html;
}

function cleanHtmlForMarkdown(html: string): string {
  const withoutHiddenUseCaseExportBlocks = removeElementsWithAttribute(
    removeElementsWithAttribute(html, "section", /\b(?:data-use-case-print-cover|data-use-case-print-toc|data-use-case-export-only)\b/iu),
    "div",
    /\bdata-use-case-export-only\b/iu
  );

  return withoutHiddenUseCaseExportBlocks
    .replace(/<script\b[\s\S]*?<\/script>/giu, "\n")
    .replace(/<style\b[\s\S]*?<\/style>/giu, "\n")
    .replace(/<astro-island\b[\s\S]*?<\/astro-island>/giu, "\n")
    .replace(/<nav\b[\s\S]*?<\/nav>/giu, "\n")
    .replace(/<form\b[\s\S]*?<\/form>/giu, "\n")
    .replace(/<button\b[\s\S]*?<\/button>/giu, "\n")
    .replace(/<svg\b[\s\S]*?<\/svg>/giu, "\n")
    .replace(/<template\b[\s\S]*?<\/template>/giu, "\n")
    .replace(/<input\b[^>]*>/giu, "\n")
    .replace(/<br\s*\/?>/giu, "\n");
}

function convertHtmlFragmentToMarkdown(html: string): string {
  let markdown = html
    .replace(/<div\b[^>]*class=["'][^"']*\bprompt-scroll__content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/giu, (_match, prompt: string) => `\n\n${formatFencedCodeBlock(prompt)}\n\n`)
    .replace(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/giu, (_match, code: string) => `\n\n${formatFencedCodeBlock(code)}\n\n`)
    .replace(/<table\b[^>]*>([\s\S]*?)<\/table>/giu, (_match, table: string) => convertTableToMarkdown(table))
    .replace(/<img\b([^>]*)>/giu, (_match, attributes: string) => {
      const alt = extractAttribute(attributes, "alt");
      const src = extractAttribute(attributes, "src");
      if (src === undefined || alt === undefined || alt.trim().length === 0) {
        return "\n";
      }

      return `\n\n![${cleanMarkdownText(alt)}](${src})\n\n`;
    })
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/giu, (_match, code: string) => formatInlineCode(code));

  for (let depth = 6; depth >= 1; depth -= 1) {
    const headingPattern = new RegExp(`<h${depth}\\b([^>]*)>([\\s\\S]*?)<\\/h${depth}>`, "giu");
    markdown = markdown.replace(headingPattern, (_match, attributes: string, inner: string) => {
      const id = extractAttribute(attributes, "id");
      const text = cleanMarkdownText(inner);
      if (text.length === 0) {
        return "\n";
      }

      return `\n\n${"#".repeat(depth)} ${text}${id === undefined ? "" : ` {#${id}}`}\n\n`;
    });
  }

  markdown = markdown
    .replace(/<\/a>\s*<a\b/giu, "</a> <a")
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/giu, (_match, attributes: string, inner: string) => {
      const href = extractAttribute(attributes, "href");
      const text = cleanLinkText(inner);
      if (href === undefined || text.length === 0) {
        return text;
      }

      const link = `[${text}](${href})`;
      return hasBlockMarkup(inner) ? `\n\n${link}\n\n` : link;
    })
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/giu, (_match, inner: string) => `\n- ${cleanMarkdownText(inner)}\n`)
    .replace(/<\/(?:p|div|section|article|header|footer|ul|ol|blockquote|table|thead|tbody|tr)>/giu, "\n\n")
    .replace(/<p\b[^>]*>/giu, "\n\n")
    .replace(/<[^>]+>/gu, " ");

  return decodeHtml(markdown);
}

function removeElementsWithAttribute(html: string, tagName: string, attributePattern: RegExp): string {
  const openingTagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "giu");
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = openingTagPattern.exec(html)) !== null) {
    if (!attributePattern.test(match[0])) {
      continue;
    }

    const end = findMatchingClosingTagEnd(html, tagName, openingTagPattern.lastIndex);
    output += html.slice(cursor, match.index);
    cursor = end ?? openingTagPattern.lastIndex;
    openingTagPattern.lastIndex = cursor;
  }

  return output + html.slice(cursor);
}

function findMatchingClosingTagEnd(html: string, tagName: string, startIndex: number): number | undefined {
  const tagPattern = new RegExp(`</?${tagName}\\b[^>]*>`, "giu");
  tagPattern.lastIndex = startIndex;
  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return tagPattern.lastIndex;
      }
    } else if (!match[0].endsWith("/>")) {
      depth += 1;
    }
  }

  return undefined;
}

function convertTableToMarkdown(table: string): string {
  const rowMatches = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)];
  const rows = rowMatches
    .map((rowMatch) => {
      const rowHtml = rowMatch[1] ?? "";
      const cells = [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu)].map((cellMatch) => cleanTableCell(cellMatch[1] ?? ""));
      return cells;
    })
    .filter((cells) => cells.length > 0);

  if (rows.length === 0) {
    return "\n";
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const [header = [], ...body] = rows.map((row) => padTableRow(row, columnCount));
  const separator = Array.from({ length: columnCount }, () => "---");
  const tableLines = [header, separator, ...body].map((row) => `| ${row.join(" | ")} |`);

  return `\n\n${tableLines.join("\n")}\n\n`;
}

function padTableRow(row: string[], columnCount: number): string[] {
  return [...row, ...Array.from({ length: columnCount - row.length }, () => "")];
}

function cleanTableCell(value: string): string {
  return cleanInlineMarkdownText(value).replace(/\|/gu, "\\|");
}

function cleanInlineMarkdownText(value: string): string {
  return convertInlineHtmlToMarkdown(value)
    .replace(/\s+/gu, " ")
    .trim();
}

function convertInlineHtmlToMarkdown(value: string): string {
  const markdown = value
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/giu, (_match, code: string) => formatInlineCode(code))
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/giu, (_match, attributes: string, inner: string) => {
      const href = extractAttribute(attributes, "href");
      const text = cleanLinkText(inner);
      if (href === undefined || text.length === 0) {
        return text;
      }

      return `[${text}](${href})`;
    });

  return stripTags(markdown);
}

function formatFencedCodeBlock(value: string): string {
  const code = normalizePreformattedText(value);
  const fence = "`".repeat(Math.max(3, longestBacktickRun(code) + 1));
  return `${fence}\n${protectGeneratedMarkdown(code)}\n${fence}`;
}

function normalizePreformattedText(value: string): string {
  return decodeHtml(stripTagsPreservingText(value))
    .replace(/\r\n?/gu, "\n")
    .replace(/^(?:[ \t]*\n)+/u, "")
    .replace(/(?:\n[ \t]*)+$/u, "")
    .trimEnd();
}

function formatInlineCode(value: string): string {
  const code = decodeHtml(stripTagsPreservingText(value))
    .replace(/\s+/gu, " ")
    .trim();

  if (code.length === 0) {
    return "";
  }

  const delimiter = "`".repeat(longestBacktickRun(code) + 1);
  const protectedCode = protectGeneratedMarkdown(code);
  return delimiter.length === 1 ? `${delimiter}${protectedCode}${delimiter}` : `${delimiter} ${protectedCode} ${delimiter}`;
}

function longestBacktickRun(value: string): number {
  return Math.max(0, ...[...value.matchAll(/`+/gu)].map((match) => match[0].length));
}

function protectGeneratedMarkdown(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;");
}

function extractHtmlTitle(html: string): string | undefined {
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/iu.exec(html)?.[1];
  if (h1 !== undefined) {
    return cleanMarkdownText(h1);
  }

  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(html)?.[1];
  if (title === undefined) {
    return undefined;
  }

  return cleanMarkdownText(title.replace(/\s+[–|-]\s+Codex.*$/u, ""));
}

function extractAttribute(attributes: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}=["']([^"']*)["']`, "iu");
  const value = pattern.exec(attributes)?.[1];
  return value === undefined ? undefined : decodeHtml(value);
}

function cleanMarkdownText(value: string): string {
  return decodeHtml(stripTags(value))
    .replace(/\s+/gu, " ")
    .trim();
}

function cleanLinkText(value: string): string {
  return cleanMarkdownText(value)
    .replace(/(?:^|\s)#{1,6}\s+/gu, " ")
    .trim();
}

function hasBlockMarkup(value: string): boolean {
  return /<(?:h[1-6]|p|div|section|article|ul|ol|li)\b/iu.test(value);
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/gu, " ");
}

function stripTagsPreservingText(value: string): string {
  return value.replace(/<[^>]+>/gu, "");
}

function normalizeMarkdownWhitespace(markdown: string): string {
  return markdown
    .replace(/\u00a0/gu, " ")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim() + "\n";
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&#x([0-9a-f]+);/giu, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/gu, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}
