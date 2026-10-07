import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13 tray shadow bounds and anchor gap", () => {
  it("uses asymmetric transparent host padding derived from drop-shadow blur", () => {
    const docCss = read("src/tray/tray-popover-document.css");
    expect(docCss).toContain("--tray-host-shadow-top");
    expect(docCss).toContain("--tray-host-shadow-inline");
    expect(docCss).toContain("--tray-host-shadow-bottom");
    expect(docCss).toMatch(/overflow:\s*visible/);

    const popoverCss = read("src/tray/tray-popover.css");
    expect(popoverCss).toContain("--tray-host-shadow-top:");
    expect(popoverCss).not.toContain("--tray-window-shadow-inset");
  });

  it("anchors native window from arrow tip gap independent of host padding", () => {
    const rust = read("src-tauri/src/tray_popover.rs");
    expect(rust).toContain("TRAY_ARROW_TIP_GAP");
    expect(rust).toContain("SHADOW_INSET_TOP");
    expect(rust).toContain("tray_bottom_y + TRAY_ARROW_TIP_GAP");
    expect(rust).toContain("arrow_tip_y - SHADOW_INSET_TOP");
    expect(rust).not.toContain("ARROW_GAP");
  });
});
