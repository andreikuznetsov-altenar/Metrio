import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.8B surfaces, drawers, modals", () => {
  it("drawer scrim uses token dimming below app chrome", () => {
    const surfaces = read("src/styles/app-surfaces.css");
    expect(surfaces).toContain("--drawer-scrim-color");
    expect(surfaces).toContain("--z-drawer-scrim");
    expect(surfaces).toContain("--z-modal-scrim");
    expect(surfaces).toMatch(/--z-app-chrome:\s*100/);

    const drawerCss = read("src/components/Drawer/Drawer.css");
    expect(drawerCss).toMatch(/\.drawer-root__backdrop[\s\S]*--drawer-scrim-color/);
    const shellCss = read("src/components/AppShell/AppShell.css");
    expect(shellCss).toContain("--app-drawer-viewport-top");
    expect(drawerCss).toMatch(/\.drawer-root__backdrop[\s\S]*opacity:\s*0/);
    expect(drawerCss).toMatch(/\.drawer-root\.is-open \.drawer-root__backdrop[\s\S]*opacity:\s*1/);
  });

  it("modal layer sits above drawer and below header chrome", () => {
    const modalCss = read("src/components/Modal/Modal.css");
    expect(modalCss).toContain("top: var(--app-side-surface-top");
    expect(modalCss).toContain("--z-modal-scrim");
    expect(modalCss).toContain("--z-modal-panel");

    const shellCss = read("src/components/AppShell/AppShell.css");
    expect(shellCss).toContain("--z-app-chrome");
    expect(shellCss).toMatch(/\.app-shell__viewport[\s\S]*isolation:\s*isolate/);
  });

  it("drawer lifecycle waits for transform transitionend", () => {
    const source = read("src/components/Drawer/useDrawerSurfaceLifecycle.ts");
    expect(source).toContain('event.propertyName !== "transform"');
    expect(source).toContain("transitionend");
    expect(source).toContain("requestAnimationFrame");
  });

  it("tabular modals stay on shared Modal shell", () => {
    const source = read("src/components/Modal/TabularModal.tsx");
    expect(source).toContain('from "./Modal"');
    expect(source).toContain("metrio-modal--tabular");
  });

  it("modal layer portals to document body above drawer stacking", () => {
    const source = read("src/components/Modal/Modal.tsx");
    expect(source).toContain("createPortal");
    expect(source).toContain("document.body");
    expect(source).toMatch(/addEventListener\("keydown", onKeyDown, true\)/);
  });
});
