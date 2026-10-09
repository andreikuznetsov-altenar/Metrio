import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("performance section stack", () => {
  it("uses one shared space-6 gap for top-level performance blocks", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/performance/performance-dashboard.css"),
      "utf8",
    );
    expect(css).toContain(".performance-section-stack");
    expect(css).toContain("gap: var(--space-6)");
    expect(css).toMatch(
      /\.performance-dashboard \[data-testid\^="performance-view-"\]:not\(\[hidden\]\)[\s\S]*gap: var\(--space-6\)/,
    );
    expect(css).toContain("pointer-events: none !important");
  });
});

describe("route layer pointer contract", () => {
  it("keeps inactive route layers out of hit testing", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/AppShell/AppShell.css"),
      "utf8",
    );
    expect(css).toContain(".app-route-layer[hidden]");
    expect(css).toMatch(/\.app-route-layer\[hidden\][\s\S]*pointer-events: none !important/);
    expect(css).toMatch(/\.app-route-layer \{[\s\S]*pointer-events: auto/);
    expect(css).toMatch(
      /\.app-modal-layer:has\(\.metrio-modal-root--open\)[\s\S]*pointer-events: auto/,
    );
  });
});
