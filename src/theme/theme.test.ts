import { describe, expect, it } from "vitest";
import { resolveTheme } from "../theme/theme";

describe("resolveTheme", () => {
  it("returns explicit light and dark preferences", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("delegates system preference to resolveSystemTheme", () => {
    const result = resolveTheme("system");
    expect(result === "light" || result === "dark").toBe(true);
  });
});
