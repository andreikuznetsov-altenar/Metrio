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
    expect(popoverCss).toContain("--tray-popover-shadow: 0 4px 12px rgba(0, 0, 0, 0.11)");
    expect(popoverCss).toMatch(
      /\.tray-popover__surface[\s\S]*box-shadow:\s*var\(--tray-popover-shadow\)/,
    );
    expect(popoverCss).not.toMatch(/\.tray-popover__surface[\s\S]*box-shadow:\s*none/);
    expect(popoverCss).not.toContain("drop-shadow");
  });

  it("bleeds shadow on all sides without a giant top safe area", () => {
    const popoverCss = read("src/tray/tray-popover.css");
    expect(popoverCss).toContain("--tray-host-shadow-bleed-top: 12px");
    expect(popoverCss).toContain("--tray-host-shadow-bleed-x: 16px");
    expect(popoverCss).toContain("--tray-host-shadow-bleed-bottom: 20px");
    expect(popoverCss).toMatch(
      /\.tray-popover[\s\S]*padding:\s*var\(--tray-host-shadow-bleed-top\) var\(--tray-host-shadow-bleed-x\) var\(--tray-host-shadow-bleed-bottom\)/,
    );
    const docCss = read("src/tray/tray-popover-document.css");
    expect(docCss).not.toMatch(/body\s*\{[\s\S]*padding:/);
  });

  it("anchors visible surface 0–2px under menu bar while host includes top bleed", () => {
    const rust = read("src-tauri/src/tray_popover.rs");
    const geometry = read("src/tray/trayPopoverGeometry.ts");
    expect(rust).toContain("TRAY_POPOVER_GAP");
    expect(rust).toContain("visible_surface_top_y");
    expect(rust).toContain("TRAY_HOST_SHADOW_BLEED_TOP");
    expect(rust).toContain("host_top_y_from_visible_surface");
    expect(rust).toContain("NSPopUpMenuWindowLevel");
    expect(rust).not.toContain("TRAY_HOST_SHADOW_INSET");
    expect(rust).toContain(".shadow(false)");
    expect(rust).toContain("WindowEvent::Focused");
    expect(geometry).toContain("TRAY_POPOVER_GAP_PX = 1");
    expect(geometry).toContain("TRAY_HOST_SHADOW_BLEED_TOP_PX = 12");
    expect(geometry).toContain("trayHostWindowYFromVisibleSurface");
  });

  it("resize reports the padded host bounds", () => {
    const panel = read("src/tray/TrayPopoverPanel.tsx");
    expect(panel).toContain("Math.ceil(rect.width)");
    expect(panel).toContain("Math.ceil(rect.height)");
  });
});
