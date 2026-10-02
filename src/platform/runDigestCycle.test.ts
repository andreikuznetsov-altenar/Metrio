import { describe, expect, it, vi, beforeEach } from "vitest";
import { runDigestCycle } from "./runDigestCycle";
import { DEFAULT_PREFERENCES } from "./preferences";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../domain/snapshots/snapshotEngine";
import { testKpi } from "../domain/testFixtures";
import { resolvePerformanceReportRanges } from "../domain/performance/reportParams";
import { createPerformanceDateRange } from "../domain/performance/performanceDateRange";

vi.mock("./notificationEvents", () => ({
  recordNotificationEvent: vi.fn(),
}));

import { recordNotificationEvent } from "./notificationEvents";

const basePerson = {
  id: "self-1",
  bamboo: {
    id: "1",
    displayName: "Alex",
    firstName: "Alex",
    lastName: "",
    workEmail: "alex@co.com",
    jobTitle: "",
    status: "Active",
  },
  jira: {
    accountId: "1",
    displayName: "Alex",
    email: "alex@co.com",
    canonicalKey: "1",
  },
  identity: { matchedBy: "email", warnings: [] },
  availability: { state: "available", label: "Available", isHoliday: false },
  workload: null,
  performance: null,
  issues: [],
};

function baseResult(lastUpdatedAt: string): PerformanceFetchResult {
  return {
    teamSnapshot: {
      mode: "team",
      persons: [basePerson],
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
      persons: [basePerson],
      summary: {
        available: 1,
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
    lastUpdatedAt,
    historicalBootstrapRan: false,
  };
}

describe("runDigestCycle", () => {
  beforeEach(() => {
    vi.mocked(recordNotificationEvent).mockClear();
  });

  it("builds employee daily brief with stable id per local day", () => {
    const now = "2026-03-02T10:00:00.000Z";
    const { state } = runDigestCycle({
      prefs: DEFAULT_PREFERENCES,
      result: baseResult(now),
      viewModels: null,
      selfPersonId: "self-1",
      role: "employee",
    });
    expect(state.currentDaily?.id).toBe("daily:2026-03-02:employee");
    expect(state.currentDaily?.role).toBe("employee");
  });

  it("does not duplicate notifications on repeated refresh", () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      digests: {
        ...DEFAULT_PREFERENCES.digests,
        notifyDailyBrief: true,
      },
    };
    const now = "2026-03-02T10:00:00.000Z";
    const first = runDigestCycle({
      prefs,
      result: baseResult(now),
      viewModels: null,
      selfPersonId: "self-1",
      role: "employee",
    });
    expect(recordNotificationEvent).toHaveBeenCalledTimes(1);
    const second = runDigestCycle({
      prefs: first.prefs,
      result: baseResult(now),
      viewModels: null,
      selfPersonId: "self-1",
      role: "employee",
    });
    expect(second.state.currentDaily?.id).toBe(first.state.currentDaily?.id);
    expect(recordNotificationEvent).toHaveBeenCalledTimes(1);
  });

  it("skips native notification on weekend", () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      digests: {
        ...DEFAULT_PREFERENCES.digests,
        notifyDailyBrief: true,
      },
    };
    runDigestCycle({
      prefs,
      result: baseResult("2026-03-07T12:00:00.000Z"),
      viewModels: null,
      selfPersonId: "self-1",
      role: "employee",
    });
    expect(recordNotificationEvent).not.toHaveBeenCalled();
  });
});
