import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI13 drawer app-height geometry", () => {
  it("drawer viewport top is header-only, not page toolbar offset", () => {
    const drawerCss = read("src/components/Drawer/Drawer.css");
    const shellCss = read("src/components/AppShell/AppShell.css");
    expect(shellCss).toContain("--app-drawer-viewport-top");
    expect(drawerCss).not.toMatch(
      /\.drawer-root\s*\{[\s\S]*?top:\s*var\(--app-side-surface-top/,
    );
    expect(shellCss).not.toMatch(
      /\.app-drawer-layer[\s\S]*?top:\s*var\(--app-side-surface-top/,
    );
    const surfaces = read("src/styles/app-surfaces.css");
    expect(surfaces).toContain("--app-drawer-viewport-top: var(--app-header-height)");
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
