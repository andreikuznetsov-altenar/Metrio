import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  extractCssRuleBlocks,
  filterChangedPaths,
  formatViolations,
  LEGACY_UI_IMPORT_ALLOWED_FILES,
  resolveDiffBaseSha,
  resolveDiffFiles,
  scanFileContent,
  scanTsImportContent,
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

  it("flags raw text color in feature CSS", () => {
    const violations = scanFileContent("src/pages/foo.css", "color: #111827;");
    expect(violations.some((v) => v.rule === "text-color-raw")).toBe(true);
  });

  it("flags token hex fallbacks in feature CSS", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      "color: var(--color-danger, #dc2626);",
    );
    expect(violations.some((v) => v.rule === "color-token-fallback")).toBe(true);
  });

  it("flags card surfaces using control radius", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      ".feedback-surface-card { border-radius: var(--radius-control); }",
    );
    expect(violations.some((v) => v.rule === "card-radius-semantics")).toBe(true);
  });

  it("flags button group gap literals", () => {
    const violations = scanFileContent(
      "src/pages/foo.css",
      ".feedback-empty-state__actions { display: flex; gap: 8px; }",
    );
    expect(violations.some((v) => v.rule === "button-group-gap-literal")).toBe(true);
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

  it("flags legacy ui import from production page", () => {
    const violations = scanTsImportContent(
      "src/pages/Foo.tsx",
      `import { Button } from "../components/ui/Button";`,
    );
    expect(violations.some((v) => v.rule === "legacy-ui-production-import")).toBe(
      true,
    );
  });

  it("flags legacy ui import from shell", () => {
    const violations = scanTsImportContent(
      "src/shell/Bar.tsx",
      `import { IconButton } from "../components/ui/IconButton";`,
    );
    expect(violations.some((v) => v.rule === "legacy-ui-production-import")).toBe(
      true,
    );
  });

  it("allows legacy ui import in Foundation gallery", () => {
    for (const file of LEGACY_UI_IMPORT_ALLOWED_FILES) {
      const violations = scanTsImportContent(
        file,
        `import { Card } from "../components/ui/Card";`,
      );
      expect(violations).toEqual([]);
    }
  });

  it("allows canonical component imports", () => {
    const violations = scanTsImportContent(
      "src/pages/Foo.tsx",
      `import { Button } from "../components/Button/Button";`,
    );
    expect(violations).toEqual([]);
  });

  it("filterChangedPaths keeps only files present in diff output", () => {
    const all = ["src/pages/a.css", "src/pages/b.css", "src/shell/c.css"];
    const filtered = filterChangedPaths(all, "src/pages/a.css\nsrc/shell/c.css\n");
    expect(filtered).toEqual(["src/pages/a.css", "src/shell/c.css"]);
  });

  it("resolveDiffFiles uses DESIGN_SYSTEM_BASE_SHA in git command", () => {
    vi.stubEnv("DESIGN_SYSTEM_BASE_SHA", "abcdef1");
    const execMock = vi.fn().mockReturnValue("src/pages/changed.css\n");
    const all = ["src/pages/changed.css", "src/pages/unchanged.css"];
    const result = resolveDiffFiles(repoRoot, all, execMock);
    expect(execMock).toHaveBeenCalledWith("git diff --name-only abcdef1...HEAD", {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(result).toEqual(["src/pages/changed.css"]);
    vi.unstubAllEnvs();
  });

  it("resolveDiffBaseSha prefers DESIGN_SYSTEM_BASE_SHA", () => {
    vi.stubEnv("DESIGN_SYSTEM_BASE_SHA", "deadbeef");
    vi.stubEnv("DESIGN_SYSTEM_DIFF_BASE", "ignored");
    expect(resolveDiffBaseSha()).toBe("deadbeef");
    vi.unstubAllEnvs();
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
