import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Switch geometry", () => {
  it("keeps thumb inset and travel inside the track", () => {
    const css = readFileSync(resolve(import.meta.dirname, "Switch.css"), "utf8");
    expect(css).toContain("--switch-thumb-inset: 2px");
    expect(css).toMatch(/\.metrio-switch__thumb[\s\S]*top: var\(--switch-thumb-inset\)/);
    expect(css).toMatch(/\.metrio-switch__thumb[\s\S]*left: var\(--switch-thumb-inset\)/);
    expect(css).toMatch(
      /\.metrio-switch\[data-state="checked"\] \.metrio-switch__thumb[\s\S]*transform: translateX\(var\(--switch-thumb-travel\)\)/,
    );
    expect(css).toMatch(
      /--switch-thumb-travel:[\s\S]*var\(--switch-width\)[\s\S]*var\(--switch-thumb-size\)/,
    );
  });
});
