// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import {
  PerformanceDataProvider,
  usePerformanceData,
} from "../../app/PerformanceDataContext";
import { shouldShowGlobalRefreshStatusPanel } from "../../app/globalRefreshStatus";
import { createCoalescedRefresh } from "../refresh/refreshCoordinator";
import { ApiError } from "../../platform/apiTypes";
import { createPerformanceDateRange } from "../../domain/performance/performanceDateRange";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi } from "../../domain/testFixtures";
import type { PerformanceFetchResult } from "./performanceTypes";
import type { TeamSnapshot } from "../../domain/people/types";
import type { AuditReportData } from "../../domain/jira/types";
import { clearDashboardCacheForTests } from "../../platform/dashboard/dashboardCache";

vi.mock("./performanceDataService", () => ({
  fetchPerformanceData: vi.fn(),
}));

vi.mock("./performanceRefreshSideEffects", () => ({
  applyPerformanceRefreshSideEffects: vi.fn(async () => undefined),
  markPerformanceIntegrationsStale: vi.fn(async () => undefined),
}));

vi.mock("../refresh/backgroundRefresh", () => ({
  registerCoalescedBackgroundRefresh: vi.fn(async () => () => {}),
}));

vi.mock("../../platform/logger", () => ({
  writeLog: vi.fn(async () => undefined),
}));

import { fetchPerformanceData } from "./performanceDataService";
import {
  applyPerformanceRefreshSideEffects,
} from "./performanceRefreshSideEffects";

const mockFetch = vi.mocked(fetchPerformanceData);
const mockSideEffects = vi.mocked(applyPerformanceRefreshSideEffects);

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

function wrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      PerformanceDataProvider,
      {
        enabled: true,
        showLoadingOverlay: false,
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

describe("PASS 14.20B refresh failure semantics", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockSideEffects.mockReset();
    mockSideEffects.mockResolvedValue(undefined);
    clearDashboardCacheForTests();
  });

  it("A: core success with partial changelog warnings is not a global stale failure", async () => {
    mockFetch.mockResolvedValue({
      ...emptyResult,
      partialWarnings: ["jira_changelog_partial count=1"],
    });
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.status).toMatch(/ready|partial/));
    expect(result.current.refreshFailedWithUsableCache).toBe(false);
    expect(
      shouldShowGlobalRefreshStatusPanel({
        refreshFailedWithUsableCache: result.current.refreshFailedWithUsableCache,
        hasUsableData: Boolean(result.current.viewModels || result.current.data),
        status: result.current.status,
        uiState: result.current.uiState,
      }),
    ).toBe(false);
  });

  it("B: core Jira failure keeps previous snapshot and shows global panel latch", async () => {
    mockFetch.mockResolvedValueOnce(emptyResult);
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());

    mockFetch.mockRejectedValueOnce(new Error("Couldn't refresh Jira data."));
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.refreshFailedWithUsableCache).toBe(true));
    expect(result.current.data).toBeTruthy();
    expect(
      shouldShowGlobalRefreshStatusPanel({
        refreshFailedWithUsableCache: result.current.refreshFailedWithUsableCache,
        hasUsableData: true,
        status: result.current.status,
        uiState: result.current.uiState,
      }),
    ).toBe(true);
  });

  it("C: manual Retry success clears the global failure latch", async () => {
    mockFetch.mockResolvedValueOnce(emptyResult);
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());

    mockFetch.mockRejectedValueOnce(new Error("Couldn't refresh Jira data."));
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.refreshFailedWithUsableCache).toBe(true));

    mockFetch.mockResolvedValueOnce(emptyResult);
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.refreshFailedWithUsableCache).toBe(false));
  });

  it("D: overlapping refresh requests coalesce without concurrent runners", async () => {
    let active = 0;
    let maxActive = 0;
    const run = vi.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
    });
    const coalesced = createCoalescedRefresh(run);
    await Promise.all([coalesced(), coalesced(), coalesced()]);
    expect(maxActive).toBe(1);
    expect(run.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(run.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("E: optional side-effect failure does not destroy a successful core snapshot", async () => {
    mockFetch.mockResolvedValue(emptyResult);
    mockSideEffects.mockRejectedValueOnce(new Error("tray unavailable"));
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.refreshFailedWithUsableCache).toBe(false);
    expect(result.current.status).toMatch(/ready|partial/);
  });

  it("F: 401 surfaces credential semantics rather than a blind success", async () => {
    mockFetch.mockResolvedValueOnce(emptyResult);
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());

    mockFetch.mockRejectedValueOnce(
      new ApiError({
        code: "jira_auth_invalid",
        message: "Unauthorized",
        status: 401,
      }),
    );
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.refreshFailedWithUsableCache).toBe(true));
    expect(result.current.errorMessage).toMatch(/Jira connection needs attention/i);
  });
});
