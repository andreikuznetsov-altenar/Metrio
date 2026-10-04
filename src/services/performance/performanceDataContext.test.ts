import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import {
  PerformanceDataProvider,
  usePerformanceData,
} from "../../app/PerformanceDataContext";

vi.mock("../performance/performanceDataService", () => ({
  fetchPerformanceData: vi.fn(),
}));

vi.mock("../performance/performanceRefreshSideEffects", () => ({
  applyPerformanceRefreshSideEffects: vi.fn(async () => undefined),
  markPerformanceIntegrationsStale: vi.fn(async () => undefined),
}));

vi.mock("../refresh/backgroundRefresh", () => ({
  registerCoalescedBackgroundRefresh: vi.fn(async () => () => {}),
}));

import { fetchPerformanceData } from "../performance/performanceDataService";
import { buildPerformanceViewModels } from "../performance/performanceViewModel";
import type { PerformanceFetchResult } from "../performance/performanceTypes";
import { createPerformanceDateRange } from "../../domain/performance/performanceDateRange";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi } from "../../domain/testFixtures";
import type { TeamSnapshot } from "../../domain/people/types";
import type { AuditReportData } from "../../domain/jira/types";
import { clearDashboardCacheForTests } from "../../platform/dashboard/dashboardCache";

const mockFetch = vi.mocked(fetchPerformanceData);

function wrapper(enabled = true) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      PerformanceDataProvider,
      {
        enabled,
        dateRange: createPerformanceDateRange("30d"),
        reviewTarget: "team",
        audience: "team",
        selfPersonId: "1114",
        managerTeamTray: true,
      },
      children,
    );
  };
}

const emptyResult: PerformanceFetchResult = {
  teamSnapshot: {
    mode: "personal",
    persons: [],
    summary: {
      available: 0,
      onVacation: 0,
      vacationSoon: 0,
      highWorkload: 0,
      problematic: 0,
    },
  } satisfies TeamSnapshot,
  historyTeamSnapshot: {
    mode: "personal",
    persons: [],
    summary: {
      available: 0,
      onVacation: 0,
      vacationSoon: 0,
      highWorkload: 0,
      problematic: 0,
    },
  } satisfies TeamSnapshot,
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
  } satisfies AuditReportData,
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
  } satisfies AuditReportData,
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

describe("PerformanceDataContext", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearDashboardCacheForTests();
  });

  it("refresh calls fetchPerformanceData", async () => {
    mockFetch.mockResolvedValue(emptyResult);
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    mockFetch.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ preset: "30d" }),
      "team",
      "team",
    );
  });

  it("keeps previous viewModels when refresh fails", async () => {
    mockFetch.mockResolvedValueOnce(emptyResult);
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.viewModels).not.toBeNull());
    const previous = result.current.viewModels;
    const previousData = result.current.data;
    mockFetch.mockRejectedValueOnce(new Error("Jira unavailable"));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.viewModels).toBe(previous);
    expect(result.current.data).toBe(previousData);
    expect(result.current.stale).toBe(true);
    expect(result.current.errorMessage).toMatch(/Jira/i);
  });

  it("stores shared fetch result with snapshot and report params", async () => {
    mockFetch.mockResolvedValue(emptyResult);
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.reportParams.dateFrom).toBe("2026-01-01");
    expect(result.current.data?.lastUpdatedAt).toBeTruthy();
  });
});

describe("buildPerformanceViewModels integration sanity", () => {
  it("is importable alongside mocked fetch", () => {
    const vm = buildPerformanceViewModels(emptyResult, "1114");
    expect(vm.teamOverview.summary.length).toBeGreaterThan(0);
  });
});
