import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.7C tray popover polish", () => {
  it("uses 8px borderless surface without shadow or notch", () => {
    const css = read("src/tray/tray-popover.css");
    expect(css).toContain("--tray-popover-radius: 8px");
    expect(css).toMatch(/\.tray-popover__surface[\s\S]*border:\s*none/);
    expect(css).not.toContain("drop-shadow");
    expect(css).not.toContain(".tray-popover::before");
  });

  it("uses 16px inset padding and 12px summary gap", () => {
    const css = read("src/tray/tray-popover.css");
    expect(css).toContain("--tray-popover-padding: 16px");
    expect(css).toContain("--tray-popover-summary-gap: 12px");
    expect(css).toContain("--tray-popover-action-min-height: 32px");
  });

  it("groups primary tray commands without extra internal dividers", () => {
    const source = read("src/tray/TrayPopoverPanel.tsx");
    expect(source).toContain('className="tray-popover__actions"');
    expect(source).toContain("Open Metrio");
    expect(source).toContain("Quit");
    const dividerCount = (source.match(/tray-popover__divider/g) ?? []).length;
    expect(dividerCount).toBe(2);
  });

  it("preserves tray popover window sizing hook for anchoring", () => {
    const rust = read("src-tauri/src/tray_popover.rs");
    expect(rust).toContain("TRAY_POPOVER_GAP");
    expect(rust).toContain("clamp_host_x");
    expect(rust).toContain("host_position_for_anchor");
  });
});
