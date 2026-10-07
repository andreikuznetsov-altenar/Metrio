import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI13 tray popover final geometry", () => {
  it("uses 8px radius, 16px padding, 12px summary gap, and the canonical soft shadow", () => {
    const popoverCss = read("src/tray/tray-popover.css");
    expect(popoverCss).toContain("--tray-popover-radius: 8px");
    expect(popoverCss).toContain("--tray-popover-padding: 16px");
    expect(popoverCss).toContain("--tray-popover-summary-gap: 12px");
    expect(popoverCss).toContain("--tray-popover-shadow: 0 4px 14px rgba(15, 17, 21, 0.12)");
    expect(popoverCss).toMatch(
      /\.tray-popover__surface[\s\S]*box-shadow:\s*var\(--tray-popover-shadow\)/,
    );
    expect(popoverCss).not.toMatch(/\.tray-popover__surface[\s\S]*box-shadow:\s*none/);
    expect(popoverCss).not.toContain("drop-shadow");
  });

  it("gives the host a modest transparent inset for the shadow", () => {
    const popoverCss = read("src/tray/tray-popover.css");
    expect(popoverCss).toContain("--tray-host-shadow-inset: 16px");
    expect(popoverCss).toMatch(/\.tray-popover[\s\S]*padding:\s*var\(--tray-host-shadow-inset\)/);
    const docCss = read("src/tray/tray-popover-document.css");
    expect(docCss).not.toMatch(/body\s*\{[\s\S]*padding:/);
  });

  it("anchors visible surface 4px from icon; host is inset only for shadow room", () => {
    const rust = read("src-tauri/src/tray_popover.rs");
    const geometry = read("src/tray/trayPopoverGeometry.ts");
    expect(rust).toContain("TRAY_POPOVER_GAP");
    expect(rust).toContain("TRAY_HOST_SHADOW_INSET");
    expect(rust).toContain("tray_bottom_y + TRAY_POPOVER_GAP");
    expect(rust).toContain("visible_surface_y - TRAY_HOST_SHADOW_INSET");
    expect(rust).toContain(".shadow(false)");
    expect(geometry).toContain("TRAY_POPOVER_GAP_PX = 4");
    expect(geometry).toContain("TRAY_HOST_SHADOW_INSET_PX = 16");
  });

  it("resize reports the padded host bounds", () => {
    const panel = read("src/tray/TrayPopoverPanel.tsx");
    expect(panel).toContain("Math.ceil(rect.width)");
    expect(panel).toContain("Math.ceil(rect.height)");
  });
});
