import { describe, expect, it, vi, beforeEach } from "vitest";
import { applyPerformanceRefreshSideEffects } from "./performanceRefreshSideEffects";
import type { PerformanceFetchResult } from "./performanceTypes";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi } from "../../domain/testFixtures";
import { createPerformanceDateRange } from "../../domain/performance/performanceDateRange";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";

vi.mock("../../platform/trayActionCenter", () => ({
  pushTrayFromContext: vi.fn(async () => undefined),
  trayContextFromSelfPerson: vi.fn(() => ({
    assignmentState: {
      baselineComplete: true,
      knownAssignedIssueKeys: [],
      records: {},
    },
    activeTaskCount: 0,
    bambooActions: [],
  })),
}));

vi.mock("../../platform/jiraAssignmentNotifications", () => ({
  processJiraAssignmentNotifications: vi.fn((issues, prefs) => ({
    nextPrefs: prefs,
    newAssignmentCount: 0,
  })),
  readJiraAssignmentState: vi.fn(() => ({
    baselineComplete: true,
    knownAssignedIssueKeys: [],
    records: {},
  })),
}));

vi.mock("../../platform/notifications", () => ({
  processNotificationTransitions: vi.fn(async (prefs) => prefs),
}));

vi.mock("../../platform/preferences", () => ({
  loadPreferences: vi.fn(async () => ({
    sync: {
      lastJiraSync: null,
      lastBambooSync: null,
      lastSnapshotAt: null,
      jiraStale: true,
      bambooStale: true,
    },
    notificationState: {},
    notifications: {},
  })),
  savePreferences: vi.fn(async () => undefined),
}));

import { pushTrayFromContext } from "../../platform/trayActionCenter";
import { savePreferences } from "../../platform/preferences";

const baseResult: PerformanceFetchResult = {
  teamSnapshot: {
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
      dateFrom: "2026-01-01",
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
  historyReportData: {
    params: {
      dateFrom: "2026-01-01",
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
    dateFrom: "2026-01-01",
    dateTo: "2026-03-01",
    targetReviewDays: 3,
    users: [],
    projects: [],
  },
  reportRanges: resolvePerformanceReportRanges(
    createPerformanceDateRange("30d"),
    "team",
    "team",
    3,
  ),
  identityResolution: [],
  timeOffEntries: [],
  partialWarnings: [],
  lastUpdatedAt: "2026-03-01T12:00:00.000Z",
  historicalBootstrapRan: false,
};

describe("applyPerformanceRefreshSideEffects", () => {
  beforeEach(() => {
    vi.mocked(pushTrayFromContext).mockClear();
    vi.mocked(savePreferences).mockClear();
  });

  it("updates personal tray and clears stale sync flags after refresh", async () => {
    await applyPerformanceRefreshSideEffects(baseResult, {
      selfPersonId: "self-1",
      role: "employee",
    });
    expect(pushTrayFromContext).toHaveBeenCalledTimes(1);
    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        sync: expect.objectContaining({
          jiraStale: false,
          bambooStale: false,
          lastJiraSync: baseResult.lastUpdatedAt,
        }),
      }),
    );
  });
});
