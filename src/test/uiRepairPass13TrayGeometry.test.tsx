import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI13 tray popover final geometry", () => {
  it("uses 8px radius, 16px padding, 12px summary gap, no shadow", () => {
    const popoverCss = read("src/tray/tray-popover.css");
    expect(popoverCss).toContain("--tray-popover-radius: 8px");
    expect(popoverCss).toContain("--tray-popover-padding: 16px");
    expect(popoverCss).toContain("--tray-popover-summary-gap: 12px");
    expect(popoverCss).toMatch(/\.tray-popover[\s\S]*box-shadow:\s*none/);
    expect(popoverCss).toMatch(/\.tray-popover__surface[\s\S]*box-shadow:\s*none/);
    expect(popoverCss).not.toContain("drop-shadow");
    expect(popoverCss).not.toContain("--tray-host-shadow");
    expect(popoverCss).not.toContain("--tray-popover-drop-shadow");
  });

  it("host document has no shadow safe-area padding", () => {
    const docCss = read("src/tray/tray-popover-document.css");
    expect(docCss).not.toContain("--tray-host-shadow");
    expect(docCss).not.toMatch(/body\s*\{[\s\S]*padding:/);
  });

  it("anchors native window from 4px arrow gap without shadow inset", () => {
    const rust = read("src-tauri/src/tray_popover.rs");
    expect(rust).toContain("TRAY_ARROW_TIP_GAP");
    expect(rust).toContain("tray_bottom_y + TRAY_ARROW_TIP_GAP");
    expect(rust).toContain(".shadow(false)");
    expect(rust).not.toContain("SHADOW_INSET");
    expect(rust).toMatch(/clamp_host_y\(arrow_tip_y/);
  });

  it("resize reports popover bounds without body padding", () => {
    const panel = read("src/tray/TrayPopoverPanel.tsx");
    expect(panel).toContain("Math.ceil(rect.width)");
    expect(panel).toContain("Math.ceil(rect.height)");
    expect(panel).not.toContain("paddingLeft");
  });
});
