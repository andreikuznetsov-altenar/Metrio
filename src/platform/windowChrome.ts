import { invoke } from "@tauri-apps/api/core";
import type { ResolvedTheme, ThemePreference } from "../theme/theme";

/** Token that paints the native titlebar area: the canonical subtle chrome gray (light and dark). */
export const WINDOW_CHROME_TOKEN = "--color-surface-secondary";

/** Parses `#rgb`, `#rrggbb` or `rgb(a)(r, g, b)` into 0–255 channels. */
export function parseCssColor(value: string): [number, number, number] | null {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(text);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

/**
 * Pushes the resolved chrome token color (and native appearance) to the Tauri window so the macOS
 * titlebar tracks the design tokens instead of the OS default. Best effort: a plain browser or a
 * missing command never affects the app.
 */
export async function syncWindowChrome(
  preference: ThemePreference,
  resolved: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): Promise<void> {
  const color = parseCssColor(getComputedStyle(root).getPropertyValue(WINDOW_CHROME_TOKEN));
  if (!color) return;
  try {
    await invoke("app_set_window_chrome", {
      r: color[0],
      g: color[1],
      b: color[2],
      theme: preference === "system" ? null : resolved,
    });
  } catch {
    // not running inside Tauri (browser/dev/tests)
  }
}
