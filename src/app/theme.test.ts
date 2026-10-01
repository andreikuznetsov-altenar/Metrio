import { describe, expect, it, beforeEach } from "vitest";
import {
  applyTheme,
  getStoredThemePreference,
  resolveTheme,
  setStoredThemePreference,
} from "../app/theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("persists preference", () => {
    setStoredThemePreference("dark");
    expect(getStoredThemePreference()).toBe("dark");
  });

  it("applies resolved theme to document", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("resolves system to light when prefers light", () => {
    expect(resolveTheme("system")).toBe("light");
  });
});
