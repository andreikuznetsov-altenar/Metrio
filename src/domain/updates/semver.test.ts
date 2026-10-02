import { describe, expect, it } from "vitest";
import { compareSemVer, isNewerSemVer, parseSemVer } from "./semver";

describe("semver", () => {
  it("parses core versions", () => {
    expect(parseSemVer("0.1.0")).toEqual({
      major: 0,
      minor: 1,
      patch: 0,
      prerelease: "",
    });
    expect(parseSemVer("v1.2.3-beta.1")?.prerelease).toBe("beta.1");
  });

  it("compares semver not lexicographically", () => {
    expect(compareSemVer("0.2.0", "0.10.0")).toBe(-1);
    expect(compareSemVer("1.0.0", "0.9.9")).toBe(1);
    expect(compareSemVer("0.1.0", "0.1.0")).toBe(0);
  });

  it("detects newer versions", () => {
    expect(isNewerSemVer("0.1.1", "0.1.0")).toBe(true);
    expect(isNewerSemVer("0.1.0", "0.1.0")).toBe(false);
    expect(isNewerSemVer("not-a-version", "0.1.0")).toBe(false);
  });
});
