import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = src("src/styles/ui-interaction-system.css");

/** Removes every `@supports not selector(::-webkit-scrollbar) { … }` block (the non-WebKit fallback). */
function withoutFallbackBlocks(text: string): string {
  return text.replace(/@supports not selector\(::-webkit-scrollbar\)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
}

describe("canonical thumb-only scrollbars (root cause: standard scrollbar properties)", () => {
  it("standard scrollbar-width/-color only exist inside the non-WebKit fallback", () => {
    // They made WebKit ignore ::-webkit-scrollbar, and old-SDK-linked CI builds ignore them too,
    // which surfaced the native scrollbar track in production.
    const main = withoutFallbackBlocks(css);
    expect(main).not.toMatch(/scrollbar-width\s*:/);
    expect(main).not.toMatch(/scrollbar-color\s*:/);
    expect(css).toMatch(/@supports not selector\(::-webkit-scrollbar\)/);
  });

  it("the track and corner are transparent and there are no arrow buttons (global default)", () => {
    expect(css).toMatch(/::-webkit-scrollbar-track,\s*\n::-webkit-scrollbar-corner\s*\{\s*background:\s*transparent;/);
    expect(css).toMatch(/::-webkit-scrollbar-button\s*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/::-webkit-scrollbar-track\s*\{[^}]*background:\s*(?!transparent)/);
  });

  it("the thumb is rounded, token-driven and strengthens on hover (track never does)", () => {
    expect(css).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--scrollbar-thumb\)/);
    expect(css).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*var\(--radius-round\)/);
    expect(css).toMatch(/::-webkit-scrollbar-thumb:hover\s*\{[^}]*var\(--scrollbar-thumb-hover\)/);
    expect(css).not.toMatch(/::-webkit-scrollbar-track:hover/);
  });

  it("light and dark both resolve through the same neutral token (no hex)", () => {
    expect(css).toMatch(/--scrollbar-thumb:\s*color-mix\(in srgb, var\(--color-text-tertiary\)/);
    expect(css).toMatch(/--scrollbar-thumb-hover:\s*color-mix\(in srgb, var\(--color-text-tertiary\)/);
    const tokens = src("src/styles/tokens.css");
    expect(tokens).toMatch(/--color-text-tertiary/);
    expect(tokens.match(/--color-text-tertiary/g)!.length).toBeGreaterThanOrEqual(2); // light + dark
    const scrollbarBlock = css.slice(css.indexOf("::-webkit-scrollbar {"), css.indexOf(".metrio-text-link,"));
    expect(scrollbarBlock).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("primary scrolling uses the same pseudo-element treatment and hidden-thumb areas stay invisible", () => {
    expect(css).toMatch(/\.metrio-scroll--primary::-webkit-scrollbar\s*\{[^}]*width:/);
    expect(css).toMatch(/\.metrio-scroll--primary::-webkit-scrollbar-track,\s*\n\.metrio-scroll--primary::-webkit-scrollbar-corner\s*\{\s*background:\s*transparent/);
    expect(css).toMatch(/\.metrio-scroll::-webkit-scrollbar,[\s\S]*?\{\s*width:\s*0;\s*height:\s*0;/);
  });

  it("the real main scroll owner is the primary ScrollArea (the document itself never scrolls)", () => {
    expect(src("src/app/AppLayout.tsx")).toContain('<ScrollArea className="metrio-scroll--primary">');
    expect(src("src/app/AuthenticatedWorkspaceShell.tsx")).toContain('className="metrio-scroll--primary"');
    const globals = src("src/styles/globals.css");
    expect(globals).toMatch(/html,\s*\nbody,\s*\n#root\s*\{[^}]*overflow:\s*hidden/);
  });

  it("drawer bodies keep the PASS28 contract: single owner, auto overflow, hidden thumb", () => {
    const drawer = src("src/components/Drawer/Drawer.css");
    expect(drawer).toMatch(/\.drawer__body\s*\{[^}]*overflow-y:\s*auto/);
    expect(drawer).toMatch(/\.drawer__body\s*\{[^}]*min-height:\s*0/);
  });
});
