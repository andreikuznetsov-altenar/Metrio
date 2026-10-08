import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("motion tokens", () => {
  it("defines Phase 10 motion durations in tokens.css", () => {
    const tokensPath = path.resolve(process.cwd(), "src/styles/tokens.css");
    const css = fs.readFileSync(tokensPath, "utf8");

    expect(css).toContain("--motion-hover: 120ms");
    expect(css).toContain("--motion-control: 140ms");
    expect(css).toContain("--motion-popover: 160ms");
    expect(css).toContain("--motion-modal: 180ms");
    expect(css).toContain("--motion-drawer-open: 400ms");
    expect(css).toContain("--motion-drawer-close: 400ms");
    expect(css).toContain("--ease-drawer: cubic-bezier(0.22, 1, 0.36, 1)");
    expect(css).toContain("--drawer-panel-shadow:");
    expect(css).toContain("--ease-drawer:");

    const system = fs.readFileSync(
      path.resolve(process.cwd(), "src/styles/ui-interaction-system.css"),
      "utf8",
    );
    expect(system).toContain("margin-top: var(--icon-text-gap)");
  });
});

describe("layout shell", () => {
  it("locks document scroll and scrolls only the content viewport", () => {
    const globalsPath = path.resolve(process.cwd(), "src/styles/globals.css");
    const css = fs.readFileSync(globalsPath, "utf8");
    expect(css).toContain("overflow: hidden");

    const scrollPath = path.resolve(
      process.cwd(),
      "src/styles/ui-interaction-system.css",
    );
    const scrollCss = fs.readFileSync(scrollPath, "utf8");
    expect(scrollCss).toContain(".metrio-scroll");
    expect(scrollCss).toContain("--metrio-scrollbar-size");
    expect(scrollCss).toContain("scrollbar-gutter: auto");
    expect(scrollCss).toContain("overflow-y: auto");
    expect(scrollCss).toContain("overflow-x: hidden");
  });
});
