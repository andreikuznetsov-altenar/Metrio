import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import {
  PerformanceDataProvider,
  usePerformanceData,
} from "../../app/PerformanceDataContext";
import { fetchPerformanceData } from "../performance/performanceDataService";
import type { PerformanceFetchResult } from "../performance/performanceTypes";
import {
  createPerformanceDateRange,
  type PerformanceDateRange,
} from "../../domain/performance/performanceDateRange";
import type { PerformanceReviewTarget } from "../../domain/performance";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi } from "../../domain/testFixtures";
import type { TeamSnapshot } from "../../domain/people/types";
import type { AuditReportData } from "../../domain/jira/types";
import { PERFORMANCE_OVERLAY_MIN_MS } from "../../app/performanceLoadGuard";

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

const mockFetch = vi.mocked(fetchPerformanceData);

function resultWithMarker(marker: string): PerformanceFetchResult {
  return {
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
    lastUpdatedAt: marker,
    historicalBootstrapRan: false,
  };
}

function providerWrapper(
  dateRange: PerformanceDateRange,
  reviewTarget: PerformanceReviewTarget,
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      PerformanceDataProvider,
      {
        enabled: true,
        dateRange,
        reviewTarget,
        audience: "team",
        selfPersonId: "1114",
        managerTeamTray: true,
      },
      children,
    );
  };
}

/** Mutable props so filter tests can rerender the provider after updating the ref. */
const mutableProviderProps = {
  dateRange: createPerformanceDateRange("30d"),
  reviewTarget: "team" as PerformanceReviewTarget,
};

function mutableProviderWrapper({ children }: { children: ReactNode }) {
  return createElement(
    PerformanceDataProvider,
    {
      enabled: true,
      dateRange: mutableProviderProps.dateRange,
      reviewTarget: mutableProviderProps.reviewTarget,
      audience: "team",
      selfPersonId: "1114",
      managerTeamTray: true,
    },
    children,
  );
}

describe("PerformanceDataContext loading overlay", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(resultWithMarker("initial"));
    mutableProviderProps.dateRange = createPerformanceDateRange("30d");
    mutableProviderProps.reviewTarget = "team";
  });

  async function waitReady(
    result: { current: ReturnType<typeof usePerformanceData> },
  ) {
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.viewModels).not.toBeNull();
  }

  async function deferNextFetch() {
    let resolve!: (value: PerformanceFetchResult) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    return (marker: string) => {
      resolve(resultWithMarker(marker));
    };
  }

  it.each([
    ["date range preset", { dateRange: createPerformanceDateRange("7d") }],
    [
      "from date",
      {
        dateRange: {
          ...createPerformanceDateRange("30d"),
          from: "2026-01-15",
          preset: "custom" as const,
        },
      },
    ],
    [
      "to date",
      {
        dateRange: {
          ...createPerformanceDateRange("30d"),
          to: "2026-02-20",
          preset: "custom" as const,
        },
      },
    ],
    ["3m preset", { dateRange: createPerformanceDateRange("3m") }],
    ["review target", { reviewTarget: "sprint" as const }],
  ] as const)("shows overlay when %s changes", async (_label, change) => {
    const initialRange = createPerformanceDateRange("30d");
    const initialTarget: PerformanceReviewTarget = "team";

    const { result, rerender } = renderHook(() => usePerformanceData(), {
      wrapper: mutableProviderWrapper,
    });

    await waitReady(result);
    const previousVm = result.current.viewModels;
    const resolveRefresh = await deferNextFetch();

    mutableProviderProps.dateRange = change.dateRange ?? initialRange;
    mutableProviderProps.reviewTarget = change.reviewTarget ?? initialTarget;
    rerender();

    await waitFor(() => {
      expect(result.current.contentLoadingActive).toBe(true);
    });
    expect(result.current.viewModels).toBe(previousVm);

    await act(async () => {
      resolveRefresh("after-filter");
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("shows overlay on refresh and keeps prior viewModels", async () => {
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: providerWrapper(createPerformanceDateRange("30d"), "team"),
    });
    await waitReady(result);
    const previousVm = result.current.viewModels;
    const resolveRefresh = await deferNextFetch();

    act(() => {
      void result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.contentLoadingActive).toBe(true);
    });
    expect(result.current.viewModels).toBe(previousVm);

    await act(async () => {
      resolveRefresh("refreshed");
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("disables controls while loading and after success clears active state", async () => {
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: providerWrapper(createPerformanceDateRange("30d"), "team"),
    });
    await waitReady(result);
    const resolveRefresh = await deferNextFetch();

    act(() => {
      void result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.performanceControlsDisabled).toBe(true);
    });

    await act(async () => {
      resolveRefresh("done");
    });
    await waitFor(() => {
      expect(result.current.contentLoadingActive).toBe(false);
    });
  });

  it("removes overlay on error and keeps previous data", async () => {
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: providerWrapper(createPerformanceDateRange("30d"), "team"),
    });
    await waitReady(result);
    const previousVm = result.current.viewModels;
    const previousData = result.current.data;

    mockFetch.mockRejectedValueOnce(new Error("Jira unavailable"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.viewModels).toBe(previousVm);
    expect(result.current.data).toBe(previousData);
    expect(result.current.contentLoadingActive).toBe(false);
    expect(result.current.errorMessage).toMatch(/Jira/i);
  });

  it("ignores stale fetch results when filters change quickly", async () => {
    const pending: Array<(value: PerformanceFetchResult) => void> = [];
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        }),
    );

    const initialRange = createPerformanceDateRange("30d");
    const { result, rerender } = renderHook(() => usePerformanceData(), {
      wrapper: mutableProviderWrapper,
    });

    await act(async () => {
      pending.shift()?.(resultWithMarker("initial"));
    });
    await waitReady(result);

    mutableProviderProps.dateRange = createPerformanceDateRange("7d");
    rerender();
    mutableProviderProps.dateRange = createPerformanceDateRange("3m");
    rerender();

    await waitFor(() => expect(pending.length).toBeGreaterThanOrEqual(2));

    await act(async () => {
      pending[pending.length - 1]?.(resultWithMarker("quarter-win"));
    });
    await waitFor(() =>
      expect(result.current.data?.lastUpdatedAt).toBe("quarter-win"),
    );

    await act(async () => {
      pending[0]?.(resultWithMarker("stale-7d"));
    });

    expect(result.current.data?.lastUpdatedAt).toBe("quarter-win");
  });

  it("keeps overlay visible for minimum duration after refresh completes", async () => {
    const { result } = renderHook(() => usePerformanceData(), {
      wrapper: providerWrapper(createPerformanceDateRange("30d"), "team"),
    });
    await waitReady(result);

    vi.useFakeTimers();
    try {
      let resolveRefresh!: (value: PerformanceFetchResult) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise((r) => {
            resolveRefresh = r;
          }),
      );

      await act(async () => {
        void result.current.refresh();
      });

      await act(async () => {
        resolveRefresh(resultWithMarker("fast"));
        await Promise.resolve();
      });

      expect(result.current.contentLoadingActive).toBe(false);
      expect(result.current.contentOverlayVisible).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(PERFORMANCE_OVERLAY_MIN_MS);
      });

      expect(result.current.contentOverlayVisible).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
