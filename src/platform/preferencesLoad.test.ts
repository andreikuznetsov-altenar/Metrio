import { describe, expect, it, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  loadPreferences,
  loadPreferencesOutcome,
  PreferencesLoadError,
} from "./preferences";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

describe("loadPreferencesOutcome", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("returns migrated preferences from file source", async () => {
    invokeMock.mockResolvedValue({
      preferences: { schemaVersion: 6, setup: { completed: true } },
      source: "file",
      warning: null,
    });

    const outcome = await loadPreferencesOutcome();
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.source).toBe("file");
      expect(outcome.prefs.setup.completed).toBe(true);
    }
  });

  it("surfaces invoke failures instead of silent defaults", async () => {
    invokeMock.mockRejectedValue(new Error("preferences path unavailable"));

    const outcome = await loadPreferencesOutcome();
    expect(outcome).toEqual({
      ok: false,
      reason: "preferences path unavailable",
      stage: "invoke",
    });
  });

  it("throws PreferencesLoadError from loadPreferences on invoke failure", async () => {
    invokeMock.mockRejectedValue("disk error");

    await expect(loadPreferences()).rejects.toBeInstanceOf(PreferencesLoadError);
  });
});
