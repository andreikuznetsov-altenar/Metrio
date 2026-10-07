import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.8B surfaces, drawers, modals", () => {
  it("drawer scrim uses token dimming over full viewport", () => {
    const surfaces = read("src/styles/app-surfaces.css");
    expect(surfaces).toContain("--drawer-scrim-color");
    expect(surfaces).toContain("--z-drawer-scrim");
    expect(surfaces).toContain("--z-modal-scrim");
    expect(surfaces).toMatch(/--z-app-chrome:\s*100/);

    const drawerCss = read("src/components/Drawer/Drawer.css");
    expect(drawerCss).toMatch(/\.drawer-root__backdrop[\s\S]*--drawer-scrim-color/);
    const shellCss = read("src/components/AppShell/AppShell.css");
    expect(shellCss).toMatch(/\.app-drawer-layer[\s\S]*inset:\s*0/);
    expect(drawerCss).toMatch(/\.drawer-root__backdrop[\s\S]*opacity:\s*0/);
  });

  it("modal layer sits above drawer across full viewport", () => {
    const modalCss = read("src/components/Modal/Modal.css");
    expect(modalCss).toMatch(/\.metrio-modal-root[\s\S]*inset:\s*0/);
    expect(modalCss).toContain("--z-modal-scrim");
    expect(modalCss).toContain("--z-modal-panel");

    const surfaces = read("src/styles/app-surfaces.css");
    const drawerScrim = /--z-drawer-scrim:\s*(\d+)/.exec(surfaces)?.[1];
    const modalScrim = /--z-modal-scrim:\s*(\d+)/.exec(surfaces)?.[1];
    expect(Number(modalScrim)).toBeGreaterThan(Number(drawerScrim));
  });

  it("drawer lifecycle completes unmount on WAAPI animation.finished", () => {
    const source = read("src/components/Drawer/useDrawerSurfaceLifecycle.ts");
    expect(source).toContain("playDrawerEnterMotion");
    expect(source).toContain("playDrawerExitMotion");
    expect(source).toContain("motion.finished");
    expect(source).not.toContain("transitionend");
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
