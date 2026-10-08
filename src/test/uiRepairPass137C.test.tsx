import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.7C tray popover polish", () => {
  it("uses native-like radius, subtle border, and soft shadow", () => {
    const css = read("src/tray/tray-popover.css");
    expect(css).toContain("--tray-popover-radius: 20px");
    expect(css).toContain("--tray-popover-border:");
    expect(css).toMatch(
      /\.tray-popover__surface[\s\S]*box-shadow:\s*var\(--tray-popover-shadow\)/,
    );
    expect(css).not.toContain(".tray-popover::before");
  });

  it("uses 16px inset padding and 12px summary gap", () => {
    const css = read("src/tray/tray-popover.css");
    expect(css).toContain("--tray-popover-padding: 16px");
    expect(css).toContain("--tray-popover-summary-gap: 12px");
    expect(css).toContain("--tray-popover-action-min-height: 32px");
  });

  it("groups primary tray commands inside one nav without internal dividers", () => {
    const source = read("src/tray/TrayPopoverPanel.tsx");
    const navStart = source.indexOf('aria-label="Tray commands"');
    const navEnd = source.indexOf("</nav>", navStart);
    const navBlock = source.slice(navStart, navEnd);
    expect(navBlock).not.toContain("tray-popover__divider");
    expect(navBlock).toContain("Open Metrio");
    expect(navBlock).toContain("Quit");
  });
});
