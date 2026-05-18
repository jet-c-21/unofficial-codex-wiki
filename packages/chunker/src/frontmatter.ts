export type MarkdownWithFrontMatter = {
  frontMatter: string | null;
  body: string;
};

export function splitFrontMatter(markdown: string): MarkdownWithFrontMatter {
  if (!markdown.startsWith("---\n")) {
    return {
      frontMatter: null,
      body: markdown
    };
  }

  const endIndex = markdown.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return {
      frontMatter: null,
      body: markdown
    };
  }

  return {
    frontMatter: markdown.slice(0, endIndex + "\n---".length),
    body: markdown.slice(endIndex + "\n---\n".length)
  };
}
