import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script without type declarations
import { resolveBuildCommit } from "../../scripts/resolve-build-commit.mjs";

const SHA = "928068ee51e050098c17020dfc068cca0d003152";
const gitWith = (head: string, dirty = "") => (args: string[]) =>
  args[0] === "rev-parse" ? head : dirty;

describe("build commit provenance", () => {
  it("derives the commit from git HEAD, ignoring a stale env value", () => {
    expect(
      resolveBuildCommit({ env: { VITE_GIT_COMMIT: "d0a951c" }, git: gitWith(SHA) }),
    ).toBe(SHA);
  });

  it("marks a dirty tree so it cannot pose as a clean release commit", () => {
    expect(resolveBuildCommit({ env: {}, git: gitWith(SHA, " M src/a.ts") })).toBe(`${SHA}-dirty`);
  });

  it("falls back to env, then dev, when git is unavailable", () => {
    expect(resolveBuildCommit({ env: { VITE_GIT_COMMIT: "abc1234" }, git: gitWith("") })).toBe("abc1234");
    expect(resolveBuildCommit({ env: {}, git: gitWith("") })).toBe("dev");
  });

  it("resolves the real checkout without env help", () => {
    expect(resolveBuildCommit({ env: {} })).toMatch(/^[0-9a-f]{40}(-dirty)?$|^dev$/);
  });
});
