import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("UI System Pass", () => {
  it("defines motion and focus tokens", () => {
    const tokens = read("styles/tokens.css");
    expect(tokens).toContain("--motion-fast:");
    expect(tokens).toContain("--color-focus-border:");
    const system = read("styles/ui-interaction-system.css");
    expect(system).toContain(".metrio-scroll");
    expect(system).toContain(".metrio-collapsible");
  });

  it("uses single-border field focus without outline ring on inputs", () => {
    const system = read("styles/ui-interaction-system.css");
    expect(system).toMatch(
      /\.input:focus-visible[\s\S]*border-color:\s*var\(--color-focus-border\)/,
    );
    expect(system).toMatch(
      /\.input:focus-visible[\s\S]*box-shadow:\s*none/,
    );
    expect(system).toMatch(
      /\.select-trigger:focus-visible[\s\S]*border-color:\s*var\(--color-focus-border\)/,
    );
    const input = read("components/Input/Input.css");
    expect(input).not.toMatch(/\.input:focus-visible/);
  });

  it("removes delivery-risk row max-height cap", () => {
    const perf = read("pages/performance/performance-dashboard.css");
    expect(perf).not.toContain("max-height: 68px");
    expect(perf).toMatch(/performance-table--delivery-risk tbody tr[\s\S]*min-height:\s*56px/);
  });

  it("documents global rules", () => {
    const doc = readFileSync(resolve(root, "../docs/ui-interaction-rules.md"), "utf8");
    expect(doc).toContain("Entity link");
    expect(doc).toContain("Single blue border");
  });
});
