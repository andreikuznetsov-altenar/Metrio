import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "..", "..");

const HORIZONTAL_ICON_TEXT_PRIMITIVES: Array<{ file: string; selector: string }> = [
  { file: "src/components/Button/Button.css", selector: ".btn" },
  { file: "src/components/Select/Select.css", selector: ".select-trigger" },
  { file: "src/components/Select/Select.css", selector: ".select-item" },
  { file: "src/components/Toast/Toast.css", selector: ".toast" },
];

function ruleBlock(css: string, selector: string): string | null {
  const pattern = new RegExp(
    `${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`,
    "m",
  );
  const match = pattern.exec(css);
  return match?.[1] ?? null;
}

describe("icon + text horizontal gap (8px token)", () => {
  it("defines --icon-text-gap as 8px alias", () => {
    const tokens = readFileSync(join(repoRoot, "src/styles/tokens.css"), "utf8");
    expect(tokens).toMatch(/--icon-text-gap:\s*var\(--space-2\)/);
    expect(tokens).toMatch(/--space-2:\s*8px/);
  });

  it("canonical primitives use --icon-text-gap for inline icon rows", () => {
    for (const { file, selector } of HORIZONTAL_ICON_TEXT_PRIMITIVES) {
      const css = readFileSync(join(repoRoot, file), "utf8");
      const body = ruleBlock(css, selector);
      expect(body, `${file} ${selector}`).toBeTruthy();
      expect(body).toMatch(/gap:\s*var\(--icon-text-gap\)/);
    }
  });

  it("empty-state icon + associated text uses --icon-text-gap (8px)", () => {
    const files = [
      "src/components/EmptyState/empty-state.css",
      "src/components/EmptyState/EmptyState.css",
      "src/styles/ui-interaction-system.css",
      "src/pages/feedback/feedback-ds.css",
    ];
    for (const file of files) {
      const css = readFileSync(join(repoRoot, file), "utf8");
      expect(css, file).toMatch(/margin-top:\s*var\(--icon-text-gap\)/);
    }
  });
});
