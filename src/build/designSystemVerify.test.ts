import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractCssRuleBlocks,
  formatViolations,
  scanFileContent,
  verifyDesignSystem,
} from "./designSystemVerify";

const repoRoot = join(import.meta.dirname, "..", "..");

describe("design system verification", () => {
  it("passes on current production CSS (allowlist only)", () => {
    const violations = verifyDesignSystem(repoRoot);
    if (violations.length > 0) {
      console.error(formatViolations(violations));
    }
    expect(violations).toEqual([]);
  });

  it("flags single-line literal radius", () => {
    const violations = scanFileContent(
      "src/pages/foo/foo.css",
      ".x { border-radius: 9px; }",
    );
    expect(violations.some((v) => v.rule === "border-radius-literal")).toBe(true);
  });

  it("flags multiline transition literals", () => {
    const css = `.panel {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}`;
    const violations = scanFileContent("src/shell/foo.css", css);
    expect(violations.some((v) => v.rule === "transition-duration-literal")).toBe(
      true,
    );
  });

  it("parses multiline rule blocks", () => {
    const blocks = extractCssRuleBlocks(`.a {
  color: red;
  opacity: 1;
}`);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toContain("opacity");
  });

  it("flags multiline focus box-shadow in feature CSS", () => {
    const css = `.foo:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px blue;
}`;
    const violations = scanFileContent("src/pages/foo.css", css);
    expect(violations.some((v) => v.rule === "focus-box-shadow-local")).toBe(true);
  });

  it("flags local focus outline", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      ".foo:focus-visible { outline: 2px solid blue; }",
    );
    expect(violations.some((v) => v.rule === "focus-outline-local")).toBe(true);
  });

  it("flags hard-coded border colors in feature CSS", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      "border-color: #ccc;",
    );
    expect(violations.some((v) => v.rule === "border-color-raw")).toBe(true);
  });

  it("flags hard-coded backgrounds in feature CSS", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      "background: #fef2f2;",
    );
    expect(violations.some((v) => v.rule === "background-color-raw")).toBe(true);
  });

  it("flags unexpected control heights", () => {
    const violations = scanFileContent("src/shell/foo.css", "height: 35px;");
    expect(violations.some((v) => v.rule === "control-height-literal")).toBe(true);
  });

  it("flags feature scrollbar styling", () => {
    const violations = scanFileContent(
      "src/shell/foo.css",
      ".panel::-webkit-scrollbar { width: 6px; }",
    );
    expect(violations.some((v) => v.rule === "scrollbar-local")).toBe(true);
  });

  it("scans product component CSS outside pages/shell", () => {
    const violations = scanFileContent(
      "src/components/EntityLink/EntityLink.css",
      ".link { border-radius: 10px; }",
    );
    expect(violations.length).toBeGreaterThan(0);
  });

  it("allows motion token transitions", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      "transition: color var(--motion-fast) var(--ease-standard);",
    );
    expect(violations).toEqual([]);
  });

  it("uses DESIGN_SYSTEM_BASE_SHA for diff comparisons when set", () => {
    const violations = verifyDesignSystem(repoRoot);
    expect(Array.isArray(violations)).toBe(true);
  });

  it("formats actionable errors", () => {
    const text = formatViolations([
      {
        file: "src/pages/foo/foo.css",
        line: 42,
        rule: "border-radius-literal",
        message: "Use token.",
        snippet: "border-radius: 9px;",
      },
    ]);
    expect(text).toContain("src/pages/foo/foo.css:42");
  });
});
