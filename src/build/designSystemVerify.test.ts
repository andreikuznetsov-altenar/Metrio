import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatViolations,
  scanFileContent,
  verifyDesignSystem,
} from "./designSystemVerify";

const repoRoot = join(import.meta.dirname, "..", "..");

describe("design system verification", () => {
  it("passes on current production feature CSS (allowlist only)", () => {
    const violations = verifyDesignSystem(repoRoot);
    expect(violations).toEqual([]);
  });

  it("flags literal border-radius in feature CSS", () => {
    const violations = scanFileContent(
      "src/pages/foo/foo.css",
      ".x { border-radius: 9px; }",
    );
    expect(violations.some((v) => v.rule === "border-radius-literal")).toBe(true);
  });

  it("flags local scrollbar rules", () => {
    const violations = scanFileContent(
      "src/shell/foo.css",
      ".panel::-webkit-scrollbar { width: 6px; }",
    );
    expect(violations.some((v) => v.rule === "scrollbar-local")).toBe(true);
  });

  it("flags literal transition duration", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      "transition: color 180ms ease;",
    );
    expect(violations.some((v) => v.rule === "transition-duration-literal")).toBe(
      true,
    );
  });

  it("allows motion token transitions", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      "transition: color var(--motion-fast) var(--ease-standard);",
    );
    expect(violations).toEqual([]);
  });

  it("flags non-standard control heights", () => {
    const violations = scanFileContent("src/shell/foo.css", "height: 35px;");
    expect(violations.some((v) => v.rule === "control-height-literal")).toBe(
      true,
    );
  });

  it("flags local focus box-shadow in feature CSS", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      ".foo:focus { box-shadow: 0 0 0 2px #2563eb; }",
    );
    expect(violations.some((v) => v.rule === "focus-box-shadow-local")).toBe(
      true,
    );
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
    expect(text).toContain("border-radius: 9px");
  });
});
