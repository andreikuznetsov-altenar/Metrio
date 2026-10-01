import { describe, expect, it } from "vitest";
import { validateWorkspacePreferences } from "./workspaceSession";

describe("validateWorkspacePreferences", () => {
  it("accepts completed setup", () => {
    expect(
      validateWorkspacePreferences({ setup: { completed: true } }),
    ).toEqual({ ok: true });
  });

  it("rejects missing setup completion", () => {
    expect(validateWorkspacePreferences({})).toEqual({
      ok: false,
      message: "Couldn't load your workspace.",
    });
  });
});
