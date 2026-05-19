export function normalizeMarkdownBody(markdown: string): string {
  const withoutBom = markdown.replace(/^\uFEFF/u, "");
  const normalizedLineEndings = withoutBom.replace(/\r\n?/gu, "\n");
  const normalizedMdx = normalizeMdxArtifacts(normalizedLineEndings);
  const withoutChrome = removeSourceUiChrome(normalizedMdx);
  return `${withoutChrome.replace(/[ \t]+\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").replace(/\s*$/u, "")}\n`;
}

function normalizeMdxArtifacts(markdown: string): string {
  return transformOutsideFences(markdown, normalizeMdxFragment);
}

function normalizeMdxFragment(markdown: string): string {
  return markdown
    .replace(/<script\b[\s\S]*?<\/script>/giu, "\n")
    .replace(/<style\b[\s\S]*?<\/style>/giu, "\n")
    .replace(/\{"\s+"\}/gu, " ")
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/giu, (_match, attributes: string, inner: string) => {
      const href = extractAttribute(attributes, "href");
      const text = stripTags(inner).replace(/\s+/gu, " ").trim();
      if (href === undefined) {
        const id = extractAttribute(attributes, "id") ?? extractAttribute(attributes, "name");
        return id === undefined ? text : `<a id="${id}"></a>`;
      }

      return text.length === 0 ? text : `[${text}](${href})`;
    })
    .replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/giu, (_match, depth: string, attributes: string, inner: string) => {
      const text = stripTags(inner).replace(/\s+/gu, " ").trim();
      if (text.length === 0) {
        return "";
      }

      const id = extractAttribute(attributes, "id");
      return `${"#".repeat(Number.parseInt(depth, 10))} ${text}${id === undefined ? "" : ` {#${id}}`}`;
    })
    .replace(/<(?:div|section)\b([^>]*)>/giu, (_match, attributes: string) => {
      const id = extractAttribute(attributes, "id");
      return id === undefined ? "\n" : `\n<a id="${id}"></a>\n`;
    })
    .replace(/<\/(?:div|section)>/giu, "\n")
    .replace(/<CodexScreenshot\b([\s\S]*?)\/\s*>/giu, (_match, attributes: string) => {
      const alt = extractAttribute(attributes, "alt");
      const src = extractAttribute(attributes, "lightSrc") ?? extractAttribute(attributes, "src");
      return alt === undefined || src === undefined ? "\n" : `\n\n![${alt}](${src})\n\n`;
    })
    .replace(/<LinkCard\b([\s\S]*?)\/\s*>/giu, (_match, attributes: string) => {
      const title = extractAttribute(attributes, "title");
      const description = extractAttribute(attributes, "description");
      const href = extractAttribute(attributes, "href");
      if (title === undefined || href === undefined) {
        return "\n";
      }

      const text = [title, description].filter((value): value is string => value !== undefined && value.length > 0).join(" ");
      return `\n\n[${text}](${href})\n\n`;
    })
    .replace(/<CtaPillLink\b([^>]*)>([\s\S]*?)<\/CtaPillLink>/giu, (_match, attributes: string, inner: string) => {
      const href = extractAttribute(attributes, "href");
      const label = extractAttribute(attributes, "label") ?? stripTags(inner).replace(/\s+/gu, " ").trim();
      return href === undefined || label.length === 0 ? "\n" : `\n\n[${label}](${href})\n\n`;
    })
    .replace(/<CtaPillLink\b([\s\S]*?)\/\s*>/giu, (_match, attributes: string) => {
      const label = extractAttribute(attributes, "label");
      const href = extractAttribute(attributes, "href");
      return label === undefined || href === undefined ? "\n" : `\n\n[${label}](${href})\n\n`;
    })
    .replace(/<PricingCard\b([\s\S]*?)\/\s*>/giu, (_match, attributes: string) => {
      return formatPricingCard(attributes, "");
    })
    .replace(/<PricingCard\b([\s\S]*?)>([\s\S]*?)<\/PricingCard>/giu, (_match, attributes: string, body: string) => {
      return formatPricingCard(attributes, body);
    })
    .replace(/<ExampleTask\b([\s\S]*?)\/\s*>/giu, (_match, attributes: string) => {
      return formatExampleTask(attributes);
    })
    .replace(/<YouTubeEmbed\b[\s\S]*?\/\s*>/giu, "\n")
    .replace(/<CliSetupSteps\b[\s\S]*?\/\s*>/giu, "\n")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/?(?:BentoContainer|BentoContent|ContentSwitcher|WorkflowSteps|ToggleSection|ExampleGallery)\b[^>]*>/giu, "\n")
    .replace(/<ElevatedRiskBadge\b[^>]*\/\s*>/giu, "\n");
}

function transformOutsideFences(markdown: string, transform: (fragment: string) => string): string {
  const output: string[] = [];
  const current: string[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/u.test(line)) {
      flushTransformed(output, current, transform);
      output.push(line);
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    current.push(line);
  }

  flushTransformed(output, current, transform);
  return output.join("\n");
}

function flushTransformed(output: string[], current: string[], transform: (fragment: string) => string): void {
  if (current.length === 0) {
    return;
  }

  output.push(transform(current.join("\n")));
  current.length = 0;
}

function removeSourceUiChrome(markdown: string): string {
  const lines = markdown.split("\n");
  const keptLines: string[] = [];
  let skipRest = false;

  for (const line of lines) {
    if (/^##\s+No use cases match these filters\s*$/iu.test(line.trim())) {
      skipRest = true;
    }
    if (skipRest) {
      continue;
    }
    if (/\[Try in the Codex app\]\(codex:\/\/[^)]+\)/iu.test(line)) {
      continue;
    }
    if (/\[Export as PDF\]\([^)]+\)/iu.test(line)) {
      continue;
    }
    if (/\b(?:astro-[A-Za-z0-9_-]+|data-astro-rerun)\b/iu.test(line)) {
      continue;
    }
    if (isUseCaseFilterChipLine(line)) {
      continue;
    }

    keptLines.push(line);
  }

  return keptLines.join("\n");
}

function isUseCaseFilterChipLine(line: string): boolean {
  const linkCount = [...line.matchAll(/\[[^\]]+\]\(\.\/use-cases\.md\)/gu)].length;
  return linkCount >= 2 && line.replace(/\[[^\]]+\]\(\.\/use-cases\.md\)/gu, "").trim().length === 0;
}

function formatPricingCard(attributes: string, body: string): string {
  const name = extractAttribute(attributes, "name");
  const subtitle = extractAttribute(attributes, "subtitle");
  const price = extractAttribute(attributes, "price");
  const interval = extractAttribute(attributes, "interval");
  const ctaLabel = extractAttribute(attributes, "ctaLabel");
  const ctaHref = extractAttribute(attributes, "ctaHref");
  const highlight = extractAttribute(attributes, "highlight");
  const normalizedBody = body.trim();
  const lines: string[] = [];

  if (name !== undefined) {
    lines.push(`### ${name}`);
  }
  if (subtitle !== undefined) {
    lines.push(subtitle);
  }
  if (price !== undefined && price.length > 0) {
    lines.push(interval === undefined || interval.length === 0 ? `Price: ${price}` : `Price: ${price}${interval}`);
  }
  if (ctaLabel !== undefined && ctaHref !== undefined) {
    lines.push(`[${ctaLabel}](${ctaHref})`);
  }
  if (highlight !== undefined && highlight.length > 0) {
    lines.push(highlight);
  }
  if (normalizedBody.length > 0) {
    lines.push(normalizedBody);
  }

  return lines.length === 0 ? "\n" : `\n\n${lines.join("\n\n")}\n\n`;
}

function formatExampleTask(attributes: string): string {
  const description = extractAttribute(attributes, "shortDescription") ?? extractAttribute(attributes, "id");
  const prompt = extractExampleTaskPrompt(attributes);
  const lines: string[] = [];

  if (description !== undefined) {
    lines.push(`**Example: ${description}**`);
  }
  if (prompt !== undefined && prompt.length > 0) {
    lines.push(`\`\`\`\n${prompt}\n\`\`\``);
  }

  return lines.length === 0 ? "\n" : `\n\n${lines.join("\n\n")}\n\n`;
}

function extractExampleTaskPrompt(attributes: string): string | undefined {
  const directPrompt = extractAttribute(attributes, "prompt");
  if (directPrompt !== undefined) {
    return directPrompt;
  }

  const arrayMatch = /\bprompt=\{\[([\s\S]*?)\]\.join\("\\n"\)\}/u.exec(attributes);
  const arrayBody = arrayMatch?.[1];
  if (arrayBody === undefined) {
    return undefined;
  }

  const lines = [...arrayBody.matchAll(/"((?:\\.|[^"])*)"/gu)]
    .map((match) => decodeJsString(match[1] ?? ""));
  return lines.join("\n").trim();
}

function decodeJsString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/gu, '"').replace(/\\n/gu, "\n");
  }
}

function extractAttribute(attributes: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}=["']([^"']*)["']`, "iu");
  const value = pattern.exec(attributes)?.[1];
  return value === undefined ? undefined : decodeHtml(value);
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/gu, " ");
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
