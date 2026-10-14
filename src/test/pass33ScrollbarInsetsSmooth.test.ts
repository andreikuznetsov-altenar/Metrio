import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion, scrollToInstant, smoothScrollBehavior } from "../platform/scrollBehavior";

const src = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = src("src/styles/ui-interaction-system.css");
const tokens = src("src/styles/tokens.css");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PASS33 scrollbar end insets (central CSS contract)", () => {
  it("lane 8px, 4px visible thumb, transparent track, invisible 8px end spacers", () => {
    expect(css).toMatch(/::-webkit-scrollbar\s*\{\s*width:\s*8px;\s*height:\s*8px;/);
    // PASS37.2: equal transparent inset on all four sides -> 4px painted core with a true 2px cap radius
    expect(css).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*border:\s*var\(--metrio-scrollbar-side-inset, 2px\) solid transparent[^}]*border-radius:\s*var\(--radius-round\)/);
    expect(css).not.toMatch(/::-webkit-scrollbar-thumb:(vertical|horizontal)\s*\{[^}]*border-(left|right|top|bottom)-width/);
    expect(css).not.toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*border-(right|bottom)-width/);
    expect(tokens).toMatch(/--metrio-scrollbar-side-inset:\s*2px/);
    const v = css.match(/::-webkit-scrollbar-button:vertical:start:decrement,\s*\n::-webkit-scrollbar-button:vertical:end:increment\s*\{[^}]*\}/)![0];
    expect(v).toMatch(/display:\s*block/);
    expect(v).toMatch(/height:\s*calc\(var\(--metrio-scrollbar-end-inset, 8px\) - var\(--metrio-scrollbar-side-inset, 2px\)\)/);
    expect(v).toMatch(/background:\s*transparent/);
    expect(v).toMatch(/border:\s*0/);
    expect(v).not.toMatch(/(background-image|content|:hover)/);
    const h = css.match(/::-webkit-scrollbar-button:horizontal:start:decrement,\s*\n::-webkit-scrollbar-button:horizontal:end:increment\s*\{[^}]*\}/)![0];
    expect(h).toMatch(/width:\s*calc\(var\(--metrio-scrollbar-end-inset, 8px\) - var\(--metrio-scrollbar-side-inset, 2px\)\)/);
    expect(tokens).toMatch(/--metrio-scrollbar-end-inset:\s*8px/);
    // the non-spacer button positions stay hidden
    expect(css).toMatch(/::-webkit-scrollbar-button\s*\{[^}]*display:\s*none/);
  });

  it("drawers use the canonical visible thumb with auto overflow (short drawer: no scrollbar)", () => {
    expect(css).toMatch(/\.metrio-scroll--visible-thumb\s*\{[\s\S]*?overflow-y:\s*scroll/);
    for (const file of ["src/components/Drawer/Drawer.tsx", "src/components/Drawer/DrawerStack.tsx"]) {
      expect(src(file)).toContain("metrio-scroll--visible-thumb");
    }
  });
});

describe("PASS33 canonical smooth scrolling (no JS wheel layer)", () => {
  it("every Metrio scroll owner is smooth, and auto under reduced motion", () => {
    const group = (text: string) => text.match(/([^{}]*)\{\s*scroll-behavior:\s*(smooth|auto);\s*\}/g) ?? [];
    const smooth = group(css).filter((rule) => rule.includes("smooth")).join("\n");
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const selector of [".metrio-scroll", ".metrio-scroll--primary", ".metrio-scroll--visible-thumb", ".drawer__body", ".metrio-tabular-modal .performance-table-wrap"]) {
      expect(smooth).toContain(selector);
      expect(reduced).toContain(selector);
    }
    expect(reduced).toMatch(/scroll-behavior:\s*auto/);
  });

  it("no custom wheel/inertia interception exists in app source", () => {
    const sources = ["src/app/AppLayout.tsx", "src/components/ScrollArea/ScrollArea.tsx", "src/shell/MetrioAppHeader.tsx"].map(src).join("\n");
    expect(sources).not.toMatch(/addEventListener\(["']wheel["']/);
    expect(sources).not.toMatch(/onWheel/);
    expect(sources).not.toMatch(/lenis/i);
  });

  it("programmatic helpers: smooth normally, auto when reduced, instant resets", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q }));
    expect(prefersReducedMotion()).toBe(false);
    expect(smoothScrollBehavior()).toBe("smooth");
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q }));
    expect(prefersReducedMotion()).toBe(true);
    expect(smoothScrollBehavior()).toBe("auto");
    const el = { scrollTo: vi.fn(), scrollTop: 0 } as unknown as Element;
    scrollToInstant(el, 120);
    expect((el as unknown as { scrollTo: ReturnType<typeof vi.fn> }).scrollTo).toHaveBeenCalledWith({ top: 120, behavior: "instant" });
  });

  it("deterministic resets do not animate: drawer view restore uses the instant helper", () => {
    expect(src("src/pages/performance/PersonDetailDrawer.tsx")).toContain("scrollToInstant(body");
    expect(src("src/pages/performance/PersonDetailDrawer.tsx")).not.toMatch(/body\.scrollTop\s*=/);
    expect(src("src/shell/NotificationCenter.tsx")).toContain("scrollToInstant(");
  });
});
