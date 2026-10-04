import {
  buildPerformanceDatasetKey,
  createPerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import { DASHBOARD_CACHE_SCHEMA_VERSION } from "../platform/dashboard/dashboardCache";
import type { DashboardCacheFile } from "../platform/dashboard/dashboardCache";
import { buildVisualPerformanceFetchResult } from "./performanceFetchFixture";

export const VISUAL_DASHBOARD_CACHE_STORAGE_KEY = "metrio-visual-dashboard-cache";
export const VISUAL_PERFORMANCE_DELAY_MS_KEY = "metrio-visual-performance-delay-ms";
export const VISUAL_PERFORMANCE_FAIL_KEY = "metrio-visual-performance-fail";

const VISUAL_NOW = new Date("2026-10-03T09:30:00+02:00");

function buildLeadDashboardCacheFile(
  sourceLastUpdatedAt: string,
): DashboardCacheFile {
  const dateRange = createPerformanceDateRange("30d", VISUAL_NOW);
  const fetchResult = buildVisualPerformanceFetchResult("30d", "team", "team");
  return {
    schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
    savedAt: VISUAL_NOW.toISOString(),
    sourceLastUpdatedAt,
    identity: {
      selfPersonId: "person-sam",
      role: "lead",
      datasetKey: buildPerformanceDatasetKey({
        dateRange,
        reviewTarget: "team",
        audience: "team",
        selfPersonId: "person-sam",
      }),
    },
    fetchResult: {
      ...fetchResult,
      lastUpdatedAt: sourceLastUpdatedAt,
    },
  };
}

/** Playwright init-script payload for stale-while-revalidate Dashboard visuals. */
export function serializeDashboardCacheVisualFixtureForPlaywright(
  sourceLastUpdatedAt = "2026-10-03T07:00:00.000Z",
): string {
  return JSON.stringify(buildLeadDashboardCacheFile(sourceLastUpdatedAt));
}
