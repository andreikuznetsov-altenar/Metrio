import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import {
  PerformanceDataProvider,
  usePerformanceData,
} from "./PerformanceDataContext";
import { createPerformanceDateRange } from "../domain/performance/performanceDateRange";

vi.mock("../services/performance/performanceDataService", () => ({
  fetchPerformanceData: vi.fn(),
}));

vi.mock("../services/performance/performanceRefreshSideEffects", () => ({
  applyPerformanceRefreshSideEffects: vi.fn(async () => undefined),
  markPerformanceIntegrationsStale: vi.fn(async () => undefined),
}));

vi.mock("../services/refresh/backgroundRefresh", () => ({
  registerCoalescedBackgroundRefresh: vi.fn(async () => () => {}),
}));

import { fetchPerformanceData } from "../services/performance/performanceDataService";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../domain/snapshots/snapshotEngine";
import { testKpi } from "../domain/testFixtures";
import type { TeamSnapshot } from "../domain/people/types";
import type { AuditReportData } from "../domain/jira/types";
import { resolvePerformanceReportRanges } from "../domain/performance/reportParams";
import { clearDashboardCacheForTests } from "../platform/dashboard/dashboardCache";

const mockFetch = vi.mocked(fetchPerformanceData);

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

function wrapper(props: {
  dateRange?: ReturnType<typeof createPerformanceDateRange>;
  reviewTarget?: "team" | "sprint";
  showLoadingOverlay?: boolean;
}) {
  const dateRange = props.dateRange ?? createPerformanceDateRange("30d");
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      PerformanceDataProvider,
      {
        enabled: true,
        showLoadingOverlay: props.showLoadingOverlay ?? true,
        dateRange,
        reviewTarget: props.reviewTarget ?? "team",
        audience: "team",
        selfPersonId: "1114",
        managerTeamTray: true,
      },
      children,
    );
  };
}

describe("PerformanceDataProvider lifecycle", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(emptyResult);
    clearDashboardCacheForTests();
  });

  it("fetches once on mount and keeps data when overlay is toggled off", async () => {
    const { result, rerender } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper({ showLoadingOverlay: true }),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.viewModels).not.toBeNull();
  });

  it("refetches when date preset changes", async () => {
    let dateRange = createPerformanceDateRange("30d");
    function DynamicWrapper({ children }: { children: ReactNode }) {
      return createElement(
        PerformanceDataProvider,
        {
          enabled: true,
          showLoadingOverlay: false,
          dateRange,
          reviewTarget: "team",
          audience: "team",
          selfPersonId: "1114",
          managerTeamTray: true,
        },
        children,
      );
    }
    const { result, rerender } = renderHook(() => usePerformanceData(), {
      wrapper: DynamicWrapper,
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    dateRange = createPerformanceDateRange("3m");
    rerender();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it("manual refresh triggers a second fetch", async () => {
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper({}),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
