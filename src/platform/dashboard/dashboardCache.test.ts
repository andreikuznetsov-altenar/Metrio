import { describe, expect, it, beforeEach } from "vitest";
import {
  clearDashboardCacheForTests,
  DASHBOARD_CACHE_SCHEMA_VERSION,
  loadDashboardCache,
  saveDashboardCache,
  validateDashboardCache,
} from "./dashboardCache";
import { performanceDataLifecycleEmptyResult } from "../../test/helpers/performanceDataLifecycleEmptyResult";

const lookup = {
  datasetKey: "dataset-a",
  selfPersonId: "person-sam",
  role: "lead" as const,
};

function sampleFile(overrides: Partial<{ datasetKey: string; selfPersonId: string; role: string }> = {}) {
  return {
    schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
    savedAt: "2026-03-01T10:00:00.000Z",
    sourceLastUpdatedAt: "2026-03-01T09:00:00.000Z",
    identity: {
      selfPersonId: overrides.selfPersonId ?? lookup.selfPersonId,
      role: (overrides.role ?? lookup.role) as "lead",
      datasetKey: overrides.datasetKey ?? lookup.datasetKey,
    },
    fetchResult: performanceDataLifecycleEmptyResult(),
  };
}

describe("dashboardCache", () => {
  beforeEach(() => {
    clearDashboardCacheForTests();
  });

  it("ignores schema mismatch", () => {
    expect(
      validateDashboardCache({ ...sampleFile(), schemaVersion: 99 }, lookup),
    ).toBeNull();
  });

  it("ignores account mismatch", () => {
    expect(
      validateDashboardCache(sampleFile({ selfPersonId: "other" }), lookup),
    ).toBeNull();
  });

  it("round-trips through in-memory store in tests", async () => {
    const file = sampleFile();
    await saveDashboardCache(file);
    const loaded = await loadDashboardCache(lookup);
    expect(loaded?.sourceLastUpdatedAt).toBe(file.sourceLastUpdatedAt);
  });
});
