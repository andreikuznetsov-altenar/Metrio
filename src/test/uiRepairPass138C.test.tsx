import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.8C tray popover rewrite", () => {
  it("uses transparent host document without app globals background", () => {
    const docCss = read("src/tray/tray-popover-document.css");
    expect(docCss).toMatch(/html[\s\S]*background:\s*transparent/);
    expect(docCss).toMatch(/body[\s\S]*background:\s*transparent/);

    const main = read("src/trayPopover/main.tsx");
    expect(main).toContain("tray-popover-document.css");
    expect(main).not.toContain("globals.css");
  });

  it("exposes one popover surface without a gap-increasing notch", () => {
    const panel = read("src/tray/TrayPopoverPanel.tsx");
    expect(panel).not.toContain("tray-popover-shell");
    expect(panel).toContain('className="tray-popover"');
    expect(panel).toContain("tray-popover__surface");

    const css = read("src/tray/tray-popover.css");
    expect(css).toContain("--tray-popover-radius: 20px");
    expect(css).not.toMatch(/\.tray-popover::before/);
    expect(css).not.toContain(".tray-popover-shell");
  });

  it("keeps row hover inset inside horizontal padding", () => {
    const css = read("src/tray/tray-popover.css");
    expect(css).toContain("--tray-popover-padding: 16px");
    expect(css).toMatch(/\.tray-popover__action[\s\S]*border-radius:/);
    expect(css).toMatch(/\.tray-popover__surface[\s\S]*padding:/);
  });

  it("anchors visible surface near the icon without top host bleed", () => {
    const rust = read("src-tauri/src/tray_popover.rs");
    expect(rust).toContain("TRAY_POPOVER_GAP");
    expect(rust).not.toContain("TRAY_HOST_SHADOW_INSET");
    const geometry = read("src/tray/trayPopoverGeometry.ts");
    expect(geometry).toContain("TRAY_POPOVER_GAP_PX");
    expect(geometry).toContain("TRAY_HOST_SHADOW_BLEED_X_PX");
  });
});
