import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

describe("Person drawer scroll geometry", () => {
  it("inactive Profile/Brief stack panel does not inflate scroll height", () => {
    const css = read("src/pages/performance/person-detail-drawer.css");
    expect(css).toMatch(/\.person-drawer-views\s*\{[\s\S]*?position:\s*relative/);
    expect(css).toMatch(
      /\.person-drawer-view--inactive\s*\{[\s\S]*?position:\s*absolute/,
    );
    expect(css).toMatch(
      /\.person-drawer-view--inactive\s*\{[\s\S]*?visibility:\s*hidden/,
    );
  });

  it("shared drawer body owns scroll and uses canonical body padding token", () => {
    const drawerCss = read("src/components/Drawer/Drawer.css");
    expect(drawerCss).toMatch(/\.drawer__body[\s\S]*overflow-y:\s*auto/);
    expect(drawerCss).toMatch(
      /\.drawer__body[\s\S]*padding:\s*var\(--drawer-body-padding\)/,
    );
    expect(read("src/styles/tokens.css")).toContain("--drawer-body-padding:");
  });

  it("PersonDetailDrawer keeps a single scroll tree under DrawerStack body", () => {
    const source = read("src/pages/performance/PersonDetailDrawer.tsx");
    expect(source).toContain("DrawerStack");
    expect(source).toContain("person-drawer-views");
    expect(source).not.toMatch(/drawer__body[\s\S]*overflow/);
  });
});
