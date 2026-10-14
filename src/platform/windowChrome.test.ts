// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { WINDOW_CHROME_TOKEN, parseCssColor, syncWindowChrome } from "./windowChrome";

const src = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("native titlebar surface", () => {
  beforeEach(() => invoke.mockClear());

  it("parses token colors", () => {
    expect(parseCssColor("#f1f3f6")).toEqual([241, 243, 246]);
    expect(parseCssColor(" #fff ")).toEqual([255, 255, 255]);
    expect(parseCssColor("rgb(30, 34, 43)")).toEqual([30, 34, 43]);
    expect(parseCssColor("color-mix(in srgb, red, blue)")).toBeNull();
  });

  it("pushes the chrome token (not white) to the window, and pins the native theme only when chosen", async () => {
    document.documentElement.style.setProperty(WINDOW_CHROME_TOKEN, "#f1f3f6");
    await syncWindowChrome("light", "light");
    expect(invoke).toHaveBeenCalledWith("app_set_window_chrome", { r: 241, g: 243, b: 246, theme: "light" });

    document.documentElement.style.setProperty(WINDOW_CHROME_TOKEN, "#1e222b");
    await syncWindowChrome("dark", "dark");
    expect(invoke).toHaveBeenLastCalledWith("app_set_window_chrome", { r: 30, g: 34, b: 43, theme: "dark" });

    await syncWindowChrome("system", "dark");
    expect(invoke).toHaveBeenLastCalledWith("app_set_window_chrome", expect.objectContaining({ theme: null }));
  });

  it("never throws outside Tauri and skips unresolvable tokens", async () => {
    invoke.mockRejectedValueOnce(new Error("no tauri"));
    document.documentElement.style.setProperty(WINDOW_CHROME_TOKEN, "#f1f3f6");
    await expect(syncWindowChrome("light", "light")).resolves.toBeUndefined();
    document.documentElement.style.removeProperty(WINDOW_CHROME_TOKEN);
    invoke.mockClear();
    await syncWindowChrome("light", "light");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("the chrome token is a distinct gray from both the drawer surface and the white header surface", () => {
    const tokens = src("src/styles/tokens.css");
    const light = (name: string) => new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i").exec(tokens)?.[1];
    expect(light("--color-surface-secondary")).not.toBe(light("--color-surface"));
  });

  it("is wired into the theme provider, the Rust command and the window config", () => {
    expect(src("src/theme/ThemeProvider.tsx")).toContain("syncWindowChrome(preference, resolved)");
    expect(src("src-tauri/src/lib.rs")).toContain("fn app_set_window_chrome");
    expect(src("src-tauri/src/lib.rs")).toContain("app_set_window_chrome,");
    expect(src("src-tauri/src/lib.rs")).toContain("set_background_color");
    const conf = JSON.parse(src("src-tauri/tauri.conf.json"));
    expect(conf.app.windows[0].backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("the app defines no titlebar/drag-region hover shadow or hover background", () => {
    for (const file of ["src/components/AppShell/AppShell.css", "src/shell/AppHeader.css", "src/styles/app-surfaces.css"]) {
      const css = src(file);
      expect(css, file).not.toMatch(/titlebar[^{]*:hover|drag-region[^{]*:hover/i);
      expect(css, file).not.toMatch(/data-tauri-drag-region[^{]*\{[^}]*box-shadow/i);
    }
  });
});
