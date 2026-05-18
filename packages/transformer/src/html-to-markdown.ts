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
  return html
    .replace(/<script\b[\s\S]*?<\/script>/giu, "\n")
    .replace(/<style\b[\s\S]*?<\/style>/giu, "\n")
    .replace(/<astro-island\b[\s\S]*?<\/astro-island>/giu, "\n")
    .replace(/<nav\b[\s\S]*?<\/nav>/giu, "\n")
    .replace(/<form\b[\s\S]*?<\/form>/giu, "\n")
    .replace(/<button\b[\s\S]*?<\/button>/giu, "\n")
    .replace(/<svg\b[\s\S]*?<\/svg>/giu, "\n")
    .replace(/<section\b[^>]*(?:data-use-case-print-cover|data-use-case-print-toc|data-use-case-export-only)[^>]*>[\s\S]*?<\/section>/giu, "\n")
    .replace(/<div\b[^>]*data-use-case-(?:pdf|export)[^>]*>[\s\S]*?<\/div>/giu, "\n")
    .replace(/<template\b[\s\S]*?<\/template>/giu, "\n")
    .replace(/<input\b[^>]*>/giu, "\n")
    .replace(/<br\s*\/?>/giu, "\n");
}

function convertHtmlFragmentToMarkdown(html: string): string {
  let markdown = html
    .replace(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/giu, (_match, code: string) => `\n\n\`\`\`\n${decodeHtml(stripTags(code)).trim()}\n\`\`\`\n\n`)
    .replace(/<img\b([^>]*)>/giu, (_match, attributes: string) => {
      const alt = extractAttribute(attributes, "alt");
      const src = extractAttribute(attributes, "src");
      if (src === undefined || alt === undefined || alt.trim().length === 0) {
        return "\n";
      }

      return `\n\n![${cleanMarkdownText(alt)}](${src})\n\n`;
    });

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
