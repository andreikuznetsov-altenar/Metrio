import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { PerformanceDataProvider, usePerformanceData } from "../app/PerformanceDataContext";
import {
  buildPerformanceDatasetKey,
  createPerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import { performanceDataLifecycleEmptyResult } from "./helpers/performanceDataLifecycleEmptyResult";
import {
  clearDashboardCacheForTests,
  DASHBOARD_CACHE_SCHEMA_VERSION,
  saveDashboardCache,
} from "../platform/dashboard/dashboardCache";
import { buildDashboardSyncStatus } from "../domain/home/dashboardSyncStatus";

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

const mockFetch = vi.mocked(fetchPerformanceData);

const dateRangeForKey = createPerformanceDateRange("30d");
const datasetKey = buildPerformanceDatasetKey({
  dateRange: dateRangeForKey,
  reviewTarget: "team",
  audience: "team",
  selfPersonId: "person-sam",
});

function wrapper() {
  const dateRange = createPerformanceDateRange("30d");
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      PerformanceDataProvider,
      {
        enabled: true,
        showLoadingOverlay: false,
        dateRange,
        reviewTarget: "team",
        audience: "team",
        selfPersonId: "person-sam",
        managerTeamTray: false,
      },
      children,
    );
  };
}

describe("Dashboard pass 6D — stale-while-revalidate", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearDashboardCacheForTests();
  });

  it("shows data from cache before network resolves", async () => {
    const cached = performanceDataLifecycleEmptyResult();
    cached.lastUpdatedAt = "2026-02-01T12:00:00.000Z";
    await saveDashboardCache({
      schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
      savedAt: "2026-03-01T12:00:00.000Z",
      sourceLastUpdatedAt: cached.lastUpdatedAt,
      identity: {
        selfPersonId: "person-sam",
        role: "employee",
        datasetKey,
      },
      fetchResult: cached,
    });

    let resolveFetch!: (v: ReturnType<typeof performanceDataLifecycleEmptyResult>) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result } = renderHook(() => usePerformanceData(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.status).toBe("refreshing");
    expect(result.current.revalidatingFromCache).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const fresh = performanceDataLifecycleEmptyResult();
    fresh.lastUpdatedAt = "2026-03-01T12:00:00.000Z";
    await act(async () => {
      resolveFetch(fresh);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.performanceLastUpdatedAt).toBe(fresh.lastUpdatedAt);
    expect(result.current.revalidatingFromCache).toBe(false);
  });

  it("keeps cached dashboard when refresh fails", async () => {
    const cached = performanceDataLifecycleEmptyResult();
    await saveDashboardCache({
      schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
      savedAt: "2026-03-01T12:00:00.000Z",
      sourceLastUpdatedAt: cached.lastUpdatedAt,
      identity: {
        selfPersonId: "person-sam",
        role: "employee",
        datasetKey,
      },
      fetchResult: cached,
    });
    mockFetch.mockRejectedValueOnce(new Error("jira down"));

    const { result } = renderHook(() => usePerformanceData(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    await waitFor(() => expect(result.current.errorMessage).toBeTruthy());
    expect(result.current.viewModels).not.toBeNull();
    expect(result.current.stale).toBe(true);
  });

  it("ignores cache when account identity mismatches", async () => {
    const cached = performanceDataLifecycleEmptyResult();
    await saveDashboardCache({
      schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
      savedAt: "2026-03-01T12:00:00.000Z",
      sourceLastUpdatedAt: cached.lastUpdatedAt,
      identity: {
        selfPersonId: "person-other",
        role: "employee",
        datasetKey,
      },
      fetchResult: cached,
    });
    mockFetch.mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => usePerformanceData(), { wrapper: wrapper() });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(result.current.data).toBeNull();
    expect(result.current.status).toBe("loading");
  });

  it("starts without cache in loading state", async () => {
    mockFetch.mockImplementation(
      () => new Promise(() => undefined),
    );
    const { result } = renderHook(() => usePerformanceData(), { wrapper: wrapper() });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(result.current.data).toBeNull();
    expect(result.current.status).toBe("loading");
  });

  it("manual refresh does not clear data", async () => {
    mockFetch.mockResolvedValue(performanceDataLifecycleEmptyResult());
    const { result } = renderHook(() => usePerformanceData(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    mockFetch.mockImplementation(
      () => new Promise(() => undefined),
    );
    await act(async () => {
      void result.current.refresh();
    });
    expect(result.current.data).not.toBeNull();
    expect(result.current.status).toBe("refreshing");
  });

  it("formats sync status copy", () => {
    expect(
      buildDashboardSyncStatus({
        lastUpdatedAt: new Date(Date.now() - 38 * 60_000).toISOString(),
        refreshing: true,
        stale: true,
        errorMessage: null,
      }),
    ).toBeNull();
    const failed = buildDashboardSyncStatus({
      lastUpdatedAt: "2026-03-01T22:15:00.000Z",
      refreshing: false,
      stale: true,
      errorMessage: "fail",
      healthState: "refresh_failed_with_cache",
    });
    expect(failed).toBeNull();
    const stuck = buildDashboardSyncStatus({
      lastUpdatedAt: "2026-03-01T22:15:00.000Z",
      refreshing: true,
      stale: false,
      errorMessage: null,
      healthState: "refresh_stuck",
    });
    expect(stuck?.showDiagnostics).toBe(true);
  });
});
