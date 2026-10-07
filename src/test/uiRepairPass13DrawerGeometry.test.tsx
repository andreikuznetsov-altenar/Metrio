import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI13 drawer full-app overlay geometry", () => {
  it("drawer layer anchors to app shell (header top), not native titlebar", () => {
    const drawerCss = read("src/components/Drawer/Drawer.css");
    const shellCss = read("src/components/AppShell/AppShell.css");
    expect(shellCss).toMatch(/\.app-shell[\s\S]*position:\s*relative/);
    expect(shellCss).toMatch(/\.app-drawer-layer[\s\S]*position:\s*absolute/);
    expect(shellCss).toContain("--app-overlay-top-inset: 0px");
    expect(shellCss).toMatch(
      /\.app-drawer-layer[\s\S]*top:\s*var\(--app-overlay-top-inset\)/,
    );
    expect(drawerCss).toMatch(/\.drawer-root[\s\S]*inset:\s*0/);
    expect(drawerCss).toMatch(/\.drawer-root__backdrop[\s\S]*inset:\s*0/);
    expect(drawerCss).toMatch(/\.drawer[\s\S]*top:\s*0/);
    expect(drawerCss).not.toMatch(
      /\.drawer-root\s*\{[\s\S]*?top:\s*var\(--app-side-surface-top/,
    );
    expect(shellCss).not.toMatch(
      /\.app-drawer-layer[\s\S]*?top:\s*var\(--app-side-surface-top/,
    );
    expect(shellCss).not.toContain("--app-drawer-viewport-top");
  });

  it("explicit z-index stack includes drawer scrim, drawer, modal scrim, modal", () => {
    const surfaces = read("src/styles/app-surfaces.css");
    expect(surfaces).toContain("--z-drawer-scrim:");
    expect(surfaces).toContain("--z-drawer-panel:");
    expect(surfaces).toContain("--z-modal-scrim:");
    expect(surfaces).toContain("--z-modal-panel:");
    expect(surfaces).toContain("--z-toast:");
  });

  it("modal layer portals to app-modal-layer outside drawer tree", () => {
    const modal = read("src/components/Modal/Modal.tsx");
    expect(modal).toContain("portalModalSurface");
    expect(read("src/components/AppShell/AppShell.tsx")).toContain("app-modal-layer");
  });

  it("shared Drawer and DrawerStack portal to app-drawer-layer", () => {
    const drawer = read("src/components/Drawer/Drawer.tsx");
    const stack = read("src/components/Drawer/DrawerStack.tsx");
    const shell = read("src/components/AppShell/AppShell.tsx");
    expect(drawer).toContain("portalDrawerSurface");
    expect(stack).toContain("portalDrawerSurface");
    expect(read("src/components/Drawer/drawerPortal.tsx")).toContain("app-drawer-layer");
    expect(shell).toContain("app-drawer-layer");
  });

  it("Person detail stack uses DrawerStack shell", () => {
    const person = read("src/pages/performance/PersonDetailDrawer.tsx");
    expect(person).toContain("DrawerStack");
    const notification = read("src/shell/NotificationCenter.tsx");
    expect(notification).toContain('from "../components/Drawer/Drawer"');
  });
});
