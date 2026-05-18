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

  it("formats use-case prompt panels as fenced code blocks", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases/native-ios-apps",
      html: `
        <main>
          <h1>Build for iOS</h1>
          <section>
            <h2>Starter prompt</h2>
            <div data-use-case-starter-prompt-screen>
              <div>
                <div class="prompt-scroll__content whitespace-pre-wrap">Scaffold a starter SwiftUI app and add a build-and-launch script I can wire to a \`Build\` action in my local environment.

Constraints:
- Stay CLI-first. Prefer Apple&#39;s \`xcodebuild\`.

Deliver:
- the app scaffold
- the exact scheme, simulator, and checks you used</div>
              </div>
            </div>
            <div data-use-case-starter-prompt-export data-use-case-export-only>
              <div>Duplicate export prompt</div>
            </div>
          </section>
        </main>
      `
    });

    expect(markdown).toContain(`## Starter prompt

\`\`\`
Scaffold a starter SwiftUI app and add a build-and-launch script I can wire to a \`Build\` action in my local environment.

Constraints:
- Stay CLI-first. Prefer Apple's \`xcodebuild\`.

Deliver:
- the app scaffold
- the exact scheme, simulator, and checks you used
\`\`\``);
    expect(markdown).not.toContain("Duplicate export prompt");
    expect(markdown).not.toContain("        Scaffold");
  });

  it("preserves inline code before stripping remaining tags", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases/native-ios-apps",
      html: `
        <main>
          <h1>Build for iOS</h1>
          <p>Use <code>xcodebuild</code>, <code>build-for-testing</code>, and <code>&lt;Scheme&gt;</code>.</p>
        </main>
      `
    });

    expect(markdown).toContain("Use `xcodebuild`, `build-for-testing`, and `<Scheme>`.");
  });

  it("separates adjacent links", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases/agent-friendly-clis",
      html: `
        <main>
          <h1>Create a CLI Codex can use</h1>
          <p>Related links</p>
          <div><a href="/codex/skills">Codex skills</a><a href="/codex/skills#create-a-skill">Create custom skills</a></div>
        </main>
      `
    });

    expect(markdown).toContain("[Codex skills](/codex/skills) [Create custom skills](/codex/skills#create-a-skill)");
    expect(markdown).not.toContain("](/codex/skills)[");
  });

  it("converts simple HTML tables to Markdown tables", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases/agent-friendly-clis",
      html: `
        <main>
          <h1>Create a CLI Codex can use</h1>
          <table>
            <thead><tr><th>Situation</th><th>What Codex can do</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>CI logs live behind a build page.</strong></td>
                <td>Download failed logs to <code>./logs</code> and return snippets.</td>
              </tr>
              <tr>
                <td>Docs</td>
                <td>Open <a href="/codex/skills">skills</a>.</td>
              </tr>
            </tbody>
          </table>
        </main>
      `
    });

    expect(markdown).toContain("| Situation | What Codex can do |");
    expect(markdown).toContain("| --- | --- |");
    expect(markdown).toContain("| CI logs live behind a build page. | Download failed logs to `./logs` and return snippets. |");
    expect(markdown).toContain("| Docs | Open [skills](/codex/skills). |");
  });

  it("preserves syntax-highlighted code without injected spaces", () => {
    const markdown = htmlToMarkdown({
      sourceUrl: "https://developers.openai.com/codex/use-cases/macos-sidebar-detail-inspector",
      html: `
        <main>
          <h1>Build a Mac app shell</h1>
          <pre class="astro-code" data-language="swift"><code><span class="line"><span style="color:#D73A49">struct</span><span style="color:#6F42C1"> LibraryRootView</span><span>: View {</span></span>
<span class="line"><span>  @SceneStorage</span><span>(</span><span>&quot;LibraryRootView.selection&quot;</span><span>) private var selection: Item.ID?</span></span>
<span class="line"><span>  List</span><span>(</span><span>selection</span><span>: $selection) {}</span></span></code></pre>
        </main>
      `
    });

    expect(markdown).toContain(`\`\`\`
struct LibraryRootView: View {
  @SceneStorage("LibraryRootView.selection") private var selection: Item.ID?
  List(selection: $selection) {}
\`\`\``);
    expect(markdown).not.toContain("List  (  selection");
  });
});
