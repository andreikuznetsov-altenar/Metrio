import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

function json(value: unknown): string {
  return JSON.stringify(value);
}

// Warm the heavy fixture modules once, with an explicit hook budget, so individual tests are
// not charged for the cold dynamic import (which exceeds 5s when many suites start together).
beforeAll(async () => {
  await import("../platform/docFixtures");
  await import("../platform/preferences");
  await import("./docFixtureData");
}, 60_000);

describe("documentation fixture mode", () => {
  beforeEach(async () => {
    invokeMock.mockReset();
    const { resetDocFixtureModeCacheForTests } = await import("../platform/docFixtures");
    resetDocFixtureModeCacheForTests();
  });

  it("keeps synthetic documentation data off in normal app mode", async () => {
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "app_get_doc_fixture_mode") {
        return { enabled: false, role: "lead" };
      }
      if (command === "preferences_load") {
        return { preferences: {}, source: "default", warning: null };
      }
      throw new Error(`Unexpected command ${command}`);
    });

    const { loadPreferencesOutcome } = await import("../platform/preferences");
    const outcome = await loadPreferencesOutcome();

    expect(outcome.ok).toBe(true);
    expect(json(outcome)).not.toContain("Maria Camilleri");
    expect(json(outcome)).not.toContain("Andrei Morozov");
    expect(json(outcome)).not.toContain("DEMO-");
  });

  it("enables synthetic workspace data only when runtime docs mode is on", async () => {
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "app_get_doc_fixture_mode") {
        return { enabled: true, role: "ic" };
      }
      throw new Error(`Unexpected command ${command}`);
    });

    const { loadPreferencesOutcome } = await import("../platform/preferences");
    const outcome = await loadPreferencesOutcome();

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.source).toBe("file");
    expect(outcome.prefs.workEmail).toBe("maria.camilleri@metrio.example");
    expect(outcome.prefs.teamDetection?.employee?.displayName).toBe("Maria Camilleri");
    expect(invokeMock).not.toHaveBeenCalledWith("preferences_load");
  });

  it("serves DEMO-only performance work in docs mode and does not leak blocked prefixes", async () => {
    const { buildDocPerformanceFetchResult } = await import("./docFixtureData");
    const result = buildDocPerformanceFetchResult("lead", "currentMonth", "team", "team");
    const payload = json(result);

    expect(payload).toContain("Andrei Morozov");
    expect(payload).toContain("Maria Camilleri");
    expect(payload).toContain("DEMO-101");
    expect(payload).not.toContain("UX-");
    expect(payload).not.toContain("AGTC-");
    expect(payload).not.toContain("PD-");
  });

  it("keeps the explicit privacy denylist out of docs fixture payloads", async () => {
    const {
      buildDocGoalsData,
      buildDocNotificationEvents,
      buildDocPerformanceFetchResult,
      buildDocPreferences,
      buildDocSurveyData,
      buildDocBambooGoals,
    } = await import("./docFixtureData");
    const { DEFAULT_PREFERENCES, PREFERENCES_SCHEMA_VERSION } = await import(
      "../platform/preferences"
    );
    const payload = json({
      prefs: buildDocPreferences(DEFAULT_PREFERENCES, PREFERENCES_SCHEMA_VERSION, "director"),
      performance: buildDocPerformanceFetchResult("director", "currentMonth", "team", "team"),
      bambooGoals: buildDocBambooGoals("doc-maria"),
      goals: buildDocGoalsData(),
      survey: buildDocSurveyData(),
      notifications: buildDocNotificationEvents(),
    });
    const blocked = [
      ["Andrei", "Kuznetsov"].join(" "),
      ["Daria", "Chernova"].join(" "),
      ["Valeriia", "Pavlova"].join(" "),
      ["Nikita", "Utkin"].join(" "),
      ["Konstantin", "Zhuikov"].join(" "),
      "UX-",
      "AGTC-",
      "PD-",
    ];

    for (const value of blocked) {
      expect(payload).not.toContain(value);
    }
    // Builds every documentation fixture payload (~1.3s on an idle machine, >5s when the whole
    // suite runs under heavy CPU contention), so this one test gets an explicit budget.
  }, 30_000);
});
