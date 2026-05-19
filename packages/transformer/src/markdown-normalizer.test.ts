import { describe, expect, it } from "vitest";
import { normalizeMarkdownBody } from "./markdown-normalizer.js";

describe("normalizeMarkdownBody", () => {
  it("removes MDX layout wrappers while preserving article text, links, and screenshots", () => {
    const markdown = normalizeMarkdownBody(`
# Codex

<div class="grid">
  <CodexScreenshot
    alt="Codex app screenshot"
    lightSrc="/images/codex/app/light.webp"
    darkSrc="/images/codex/app/dark.webp"
  />
  <BentoContainer>
    <BentoContent href="/codex/cli/features">
### Run Codex interactively

Use <a href="/codex/cli">Codex CLI</a>.
    </BentoContent>
  </BentoContainer>
</div>
`);

    expect(markdown).toContain("# Codex");
    expect(markdown).toContain("![Codex app screenshot](/images/codex/app/light.webp)");
    expect(markdown).toContain("### Run Codex interactively");
    expect(markdown).toContain("[Codex CLI](/codex/cli)");
    expect(markdown).not.toContain("<div");
    expect(markdown).not.toContain("BentoContent");
    expect(markdown).not.toContain("CodexScreenshot");
  });

  it("formats MDX cards as plain Markdown instead of leaking components", () => {
    const markdown = normalizeMarkdownBody(`
# Codex Pricing

<PricingCard
  name="Plus"
  subtitle="Power a few focused coding sessions each week."
  price="$20"
  interval="/month"
  ctaLabel="Get Plus"
  ctaHref="https://chatgpt.com/explore/plus"
  highlight="Everything in Free and:"
>
  - Codex on the web, in the CLI, and in the IDE extension
</PricingCard>

<LinkCard
  title="Quickstart"
  href="/codex/quickstart"
  description="Download and start building with Codex."
/>
`);

    expect(markdown).toContain("### Plus");
    expect(markdown).toContain("Power a few focused coding sessions each week.");
    expect(markdown).toContain("Price: $20/month");
    expect(markdown).toContain("[Get Plus](https://chatgpt.com/explore/plus)");
    expect(markdown).toContain("[Quickstart Download and start building with Codex.](/codex/quickstart)");
    expect(markdown).not.toContain("PricingCard");
    expect(markdown).not.toContain("LinkCard");
  });

  it("formats child CTAs and example tasks without leaking setup scripts", () => {
    const markdown = normalizeMarkdownBody(`
# Quickstart

<script data-astro-rerun>
console.log("browser-only setup");
</script>

<ExampleGallery>
  <ExampleTask
    id="snake-game"
    shortDescription="Build a classic Snake game in this repo."
    prompt={[
      "Build a classic Snake game in this repo.",
      "",
      "Deliverables:",
      "- A small set of files/changes.",
    ].join("\\n")}
    iconName="gamepad"
  />
</ExampleGallery>

<CtaPillLink href="https://openai.com/form/codex-for-oss/">
  Apply today!
</CtaPillLink>
`);

    expect(markdown).toContain("**Example: Build a classic Snake game in this repo.**");
    expect(markdown).toContain("Build a classic Snake game in this repo.\n\nDeliverables:");
    expect(markdown).toContain("[Apply today!](https://openai.com/form/codex-for-oss/)");
    expect(markdown).not.toContain("data-astro-rerun");
    expect(markdown).not.toContain("ExampleTask");
    expect(markdown).not.toContain("CtaPillLink");
  });

  it("removes use-case controls without touching fenced code", () => {
    const markdown = normalizeMarkdownBody(`
# Query tabular data

[Workflow](./use-cases.md) [Knowledge Work](./use-cases.md)

[Try in the Codex app](codex://new?prompt=test)

[Export as PDF](./analyze-data-export.md)

\`\`\`
<div class="example">Keep code intact</div>
\`\`\`

## No use cases match these filters

Try clearing a few filters.
`);

    expect(markdown).toContain("<div class=\"example\">Keep code intact</div>");
    expect(markdown).not.toContain("Try in the Codex app");
    expect(markdown).not.toContain("Export as PDF");
    expect(markdown).not.toContain("No use cases match");
    expect(markdown).not.toContain("[Workflow](./use-cases.md)");
  });
});
