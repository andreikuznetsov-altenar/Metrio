import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.7B side panels and motion", () => {
  it("drawers use soft left shadow token and full-viewport overlay layer", () => {
    const drawerCss = read("src/components/Drawer/Drawer.css");
    expect(drawerCss).toContain("box-shadow: var(--drawer-panel-shadow)");

    const shellCss = read("src/components/AppShell/AppShell.css");
    expect(shellCss).toMatch(/\.app-drawer-layer[\s\S]*position:\s*absolute/);
    expect(shellCss).toMatch(/\.app-drawer-layer[\s\S]*top:\s*0/);
    expect(shellCss).toContain("--app-side-surface-top");
    expect(shellCss).toMatch(/\.app-shell__header[\s\S]*--z-app-chrome/);
  });

  it("modal backdrop keeps dimming separate from drawers", () => {
    const modalCss = read("src/components/Modal/Modal.css");
    expect(modalCss).toMatch(/\.metrio-modal-root__backdrop[\s\S]*rgba\(/);
  });

  it("notification scroll region uses stable side-panel scrollbar", () => {
    const source = read("src/shell/NotificationCenter.tsx");
    expect(source).toContain("metrio-scroll");
    const css = read("src/styles/ui-interaction-system.css");
    expect(css).toContain("--metrio-scrollbar-size");
    expect(css).toContain("scrollbar-gutter: auto");
  });

  it("drawer panel placeholder component exists for side-panel empties", () => {
    const source = read("src/components/Drawer/DrawerPanelPlaceholder.tsx");
    expect(source).toContain("EmptyState");
    expect(source).toContain("metrio-empty-state--drawer-panel");
  });

  it("drawer motion uses open/close durations without transition all", () => {
    const motion = read("src/components/Drawer/drawerPanelMotion.ts");
    expect(motion).toContain("readMotionDrawerOpenMs");
    expect(motion).toContain("readMotionDrawerCloseMs");
    const css = read("src/components/Drawer/Drawer.css");
    expect(css).not.toMatch(/\.drawer\s*\{[\s\S]*transition:\s*transform/);
  });
});
