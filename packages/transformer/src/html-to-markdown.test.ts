import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./html-to-markdown.js";

describe("htmlToMarkdown", () => {
  it("extracts use-case page structure from static HTML", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases/github-code-reviews",
      html: `
        <html>
          <body>
            <header><h2>Search the Codex docs</h2></header>
            <main>
              <section data-use-case-print-cover><h1>Export duplicate</h1></section>
              <header>
                <h1>Codex code review for GitHub pull requests</h1>
                <p>Catch regressions and potential issues before human review.</p>
              </header>
              <article>
                <h2 id="how-to-use"><span>How to use</span><button>Copy</button></h2>
                <p>Open <a href="/codex/integrations/github">Codex in GitHub</a>.</p>
                <ul><li>Review pull requests</li></ul>
              </article>
            </main>
          </body>
        </html>
      `
    });

    expect(markdown).toContain("# Codex code review for GitHub pull requests");
    expect(markdown).toContain("## How to use {#how-to-use}");
    expect(markdown).toContain("[Codex in GitHub](/codex/integrations/github)");
    expect(markdown).toContain("- Review pull requests");
    expect(markdown).not.toContain("Export duplicate");
    expect(markdown).not.toContain("Search the Codex docs");
  });

  it("preserves only meaningful images", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases",
      html: `
        <main>
          <h1>Codex Use Cases</h1>
          <img src="/decorative.png" alt="" aria-hidden="true">
          <img src="/diagram.png" alt="Workflow diagram">
        </main>
      `
    });

    expect(markdown).toContain("![Workflow diagram](/diagram.png)");
    expect(markdown).not.toContain("decorative.png");
  });

  it("formats block card links without leaking heading markers into link text", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases",
      html: `
        <main>
          <h1>Codex Use Cases</h1>
          <a href="/codex/use-cases/collections/production-systems">
            <div><h2>Production systems</h2><p>Use Codex with production constraints.</p></div>
          </a>
        </main>
      `
    });

    expect(markdown).toContain("[Production systems Use Codex with production constraints.](/codex/use-cases/collections/production-systems)");
    expect(markdown).not.toContain("[## Production systems");
  });
});
