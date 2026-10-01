import { describe, expect, it, vi } from "vitest";
import { buildPerformanceExportPayloadFromFetch } from "./performanceExportBridge";
import type { PerformanceFetchResult } from "../performance/performanceTypes";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi, testWorkload } from "../../domain/testFixtures";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";

vi.mock("../../platform/preferences", () => ({
  loadPreferences: vi.fn(async () => ({
    appearance: { displayTimezone: "UTC", hideFractionalTimezones: false },
    reportFilters: {
      dateFrom: "2026-01-01",
      dateTo: "2026-03-01",
      targetReviewDays: 3,
      projects: [],
      teamScope: "direct",
    },
  })),
}));

function fetchResult(): PerformanceFetchResult {
  return {
    teamSnapshot: {
      mode: "team",
      persons: [
        {
          id: "914",
          bamboo: {
            id: "914",
            displayName: "Sam Dev",
            firstName: "Sam",
            lastName: "Dev",
            workEmail: "sam@co.com",
            jobTitle: "Eng",
            status: "Active",
          },
          jira: {
            accountId: "j1",
            displayName: "Sam Dev",
            email: "sam@co.com",
            canonicalKey: "j1",
          },
          identity: { matchedBy: "email", warnings: [] },
          availability: { state: "available", label: "Available", isHoliday: false },
          workload: testWorkload({ activeCount: 2 }),
          performance: testKpi(),
          issues: [],
        },
      ],
      summary: {
        available: 1,
        onVacation: 0,
        vacationSoon: 0,
        highWorkload: 0,
        problematic: 0,
      },
    },
    historyTeamSnapshot: {
      mode: "team",
      persons: [],
      summary: {
        available: 0,
        onVacation: 0,
        vacationSoon: 0,
        highWorkload: 0,
        problematic: 0,
      },
    },
    reportData: {
      params: {
        dateFrom: "2026-02-01",
        dateTo: "2026-03-01",
        targetReviewDays: 3,
        users: [],
        projects: ["MET"],
      },
      grouped: {},
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: testKpi(),
      perUserKpi: {},
    },
    historyReportData: {
      params: {
        dateFrom: "2025-01-01",
        dateTo: "2026-03-01",
        targetReviewDays: 3,
        users: [],
        projects: [],
      },
      grouped: {},
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: testKpi(),
      perUserKpi: {},
    },
    kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
    reportParams: {
      dateFrom: "2026-02-01",
      dateTo: "2026-03-01",
      targetReviewDays: 3,
      users: [],
      projects: ["MET"],
    },
    reportRanges: resolvePerformanceReportRanges("30d", "team", "team"),
    identityResolution: [],
    timeOffEntries: [],
    partialWarnings: [],
    lastUpdatedAt: "2026-03-01T12:00:00.000Z",
    historicalBootstrapRan: false,
  };
}

describe("buildPerformanceExportPayloadFromFetch", () => {
  it("uses live report params and team scope without refetching", async () => {
    const payload = await buildPerformanceExportPayloadFromFetch({
      data: fetchResult(),
      view: "team-overview",
      audience: "team",
      selfPersonId: "914",
    });
    expect(payload.metadata.reportRange).toContain("2026");
    expect(payload.metadata.projects).toBe("MET");
    expect(payload.metadata.teamScope).toBe("Direct reports only");
    expect(payload.sections.length).toBeGreaterThan(0);
  });

  it("scopes personal export to the signed-in person", async () => {
    const payload = await buildPerformanceExportPayloadFromFetch({
      data: fetchResult(),
      view: "personal-my-week",
      audience: "employee",
      selfPersonId: "914",
    });
    expect(payload.metadata.personName).toBe("Sam Dev");
  });
});
