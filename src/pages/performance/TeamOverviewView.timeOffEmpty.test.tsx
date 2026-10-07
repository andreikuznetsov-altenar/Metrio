import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("Time Off empty-state icon/text contract", () => {
  it("associates the calendar icon with its message at --icon-text-gap", () => {
    const view = read("src/pages/performance/TeamOverviewView.tsx");
    expect(view).toContain("performance-empty--timeoff");
    expect(view).toContain("time-off-empty-state");
    expect(view).toContain("No upcoming time off");
    expect(view).toContain("performance-empty__icon");
    expect(view).toContain("performance-empty__message");

    const css = read("src/pages/performance/performance-dashboard.css");
    expect(css).toMatch(
      /\.performance-empty--compact[\s\S]*gap:\s*var\(--icon-text-gap\)/,
    );
    expect(css).toMatch(
      /\.performance-empty--compact \.performance-empty__icon \+ \.performance-empty__message[\s\S]*margin:\s*0/,
    );
    expect(css).toMatch(
      /\.performance-empty--timeoff[\s\S]*gap:\s*var\(--icon-text-gap\)/,
    );
    expect(css).not.toMatch(
      /\.performance-empty--compact \.performance-empty__message[\s\S]*margin:\s*var\(--space-6\)/,
    );

    const tokens = read("src/styles/tokens.css");
    expect(tokens).toMatch(/--icon-text-gap:\s*var\(--space-2\)/);
    expect(tokens).toMatch(/--space-2:\s*8px/);
  });
});
