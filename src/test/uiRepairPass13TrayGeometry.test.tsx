import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI13 tray popover final geometry", () => {
  it("uses native-like radius, padding, summary gap, and soft shadow", () => {
    const popoverCss = read("src/tray/tray-popover.css");
    expect(popoverCss).toContain("--tray-popover-radius: 20px");
    expect(popoverCss).toContain("--tray-popover-padding: 16px");
    expect(popoverCss).toContain("--tray-popover-summary-gap: 12px");
    expect(popoverCss).toContain("--tray-popover-shadow: 0 8px 24px rgba(0, 0, 0, 0.16)");
    expect(popoverCss).toMatch(
      /\.tray-popover__surface[\s\S]*box-shadow:\s*var\(--tray-popover-shadow\)/,
    );
    expect(popoverCss).not.toMatch(/\.tray-popover__surface[\s\S]*box-shadow:\s*none/);
    expect(popoverCss).not.toContain("drop-shadow");
  });

  it("bleeds shadow on sides/bottom only, not above the surface", () => {
    const popoverCss = read("src/tray/tray-popover.css");
    expect(popoverCss).toContain("--tray-host-shadow-bleed-x: 12px");
    expect(popoverCss).toContain("--tray-host-shadow-bleed-bottom: 14px");
    expect(popoverCss).toMatch(
      /\.tray-popover[\s\S]*padding:\s*0 var\(--tray-host-shadow-bleed-x\) var\(--tray-host-shadow-bleed-bottom\)/,
    );
    const docCss = read("src/tray/tray-popover-document.css");
    expect(docCss).not.toMatch(/body\s*\{[\s\S]*padding:/);
  });

  it("anchors visible surface ~3px from tray; host top matches surface", () => {
    const rust = read("src-tauri/src/tray_popover.rs");
    const geometry = read("src/tray/trayPopoverGeometry.ts");
    expect(rust).toContain("TRAY_POPOVER_GAP");
    expect(rust).toContain("tray_bottom_y + TRAY_POPOVER_GAP");
    expect(rust).not.toContain("TRAY_HOST_SHADOW_INSET");
    expect(rust).toContain(".shadow(false)");
    expect(geometry).toContain("TRAY_POPOVER_GAP_PX = 3");
    expect(geometry).toContain("trayHostWindowYFromVisibleSurface");
  });

  it("resize reports the padded host bounds", () => {
    const panel = read("src/tray/TrayPopoverPanel.tsx");
    expect(panel).toContain("Math.ceil(rect.width)");
    expect(panel).toContain("Math.ceil(rect.height)");
  });
});
