import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_SLOW_MS,
  REFRESH_STUCK_MS,
  resolveDashboardDataHealth,
} from "./dashboardDataHealth";

describe("resolveDashboardDataHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const base = {
    hasEverSuccessfulSnapshot: false,
    hasUsableDashboardData: false,
    refreshing: false,
    stale: false,
    errorMessage: null as string | null,
    refreshStartedAt: null as number | null,
    now: Date.now(),
  };

  it("returns cold_start when no snapshot and no workspace", () => {
    expect(resolveDashboardDataHealth(base).state).toBe("cold_start");
  });

  it("returns initial_loading on first fetch", () => {
    const now = Date.now();
    expect(
      resolveDashboardDataHealth({
        ...base,
        now,
        refreshing: true,
        refreshStartedAt: now,
      }).state,
    ).toBe("initial_loading");
  });

  it("returns refresh_stuck after watchdog threshold", () => {
    const started = Date.now() - REFRESH_STUCK_MS - 1;
    const result = resolveDashboardDataHealth({
      ...base,
      hasUsableDashboardData: true,
      hasEverSuccessfulSnapshot: true,
      refreshing: true,
      refreshStartedAt: started,
      now: Date.now(),
    });
    expect(result.state).toBe("refresh_stuck");
  });

  it("shows slow hint between slow and stuck thresholds", () => {
    const started = Date.now() - REFRESH_SLOW_MS - 100;
    const result = resolveDashboardDataHealth({
      ...base,
      hasUsableDashboardData: true,
      refreshing: true,
      refreshStartedAt: started,
      now: Date.now(),
    });
    expect(result.state).toBe("refreshing");
    expect(result.showSlowRefreshHint).toBe(true);
  });

  it("returns refresh_failed_with_cache when stale error with data", () => {
    expect(
      resolveDashboardDataHealth({
        ...base,
        hasUsableDashboardData: true,
        hasEverSuccessfulSnapshot: true,
        stale: true,
        errorMessage: "fail",
      }).state,
    ).toBe("refresh_failed_with_cache");
  });

  it("returns refresh_failed_without_cache when error and no data", () => {
    expect(
      resolveDashboardDataHealth({
        ...base,
        errorMessage: "fail",
      }).state,
    ).toBe("refresh_failed_without_cache");
  });
});
