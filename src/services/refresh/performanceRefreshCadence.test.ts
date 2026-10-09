import { afterEach, describe, expect, it } from "vitest";
import {
  BAMBOO_TTL_MS,
  clearBambooTimeOffCache,
  getBambooTimeOffCache,
  isBambooTimeOffFresh,
  noteBambooTimeOffFetched,
  PERFORMANCE_BACKGROUND_INTERVAL_MS,
  PERFORMANCE_BACKGROUND_INTERVAL_SECS,
  shouldFetchBambooTimeOff,
  shouldRefreshOnSystemResume,
  SURVEY_BACKGROUND_INTERVAL_SECS,
} from "./performanceRefreshCadence";
import { NATIVE_BACKGROUND_INTERVALS } from "./backgroundRefresh";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("performanceRefreshCadence", () => {
  afterEach(() => {
    clearBambooTimeOffCache();
  });

  it("A. app timer = 15 minutes (native + TS cadence)", () => {
    expect(PERFORMANCE_BACKGROUND_INTERVAL_SECS).toBe(15 * 60);
    expect(NATIVE_BACKGROUND_INTERVALS.appRefreshSecs).toBe(15 * 60);
    const lib = readFileSync(
      resolve(process.cwd(), "src-tauri/src/lib.rs"),
      "utf8",
    );
    expect(lib).toContain('"background-app-refresh", 15 * 60');
    expect(lib).not.toContain('"background-app-refresh", 5 * 60');
  });

  it("I. survey scheduler remains 15 minutes", () => {
    expect(SURVEY_BACKGROUND_INTERVAL_SECS).toBe(15 * 60);
    expect(NATIVE_BACKGROUND_INTERVALS.surveySyncSecs).toBe(15 * 60);
    const lib = readFileSync(
      resolve(process.cwd(), "src-tauri/src/lib.rs"),
      "utf8",
    );
    expect(lib).toContain('"background-survey-sync", 15 * 60');
  });

  it("B. three 15-minute Jira cycles do not refetch Bamboo while TTL remains valid", () => {
    const t0 = 1_000_000;
    noteBambooTimeOffFetched([{ employeeId: "1", start: "2026-01-01", end: "2026-01-02" } as never], t0);
    for (const offset of [
      PERFORMANCE_BACKGROUND_INTERVAL_MS,
      PERFORMANCE_BACKGROUND_INTERVAL_MS * 2,
      PERFORMANCE_BACKGROUND_INTERVAL_MS * 3,
    ]) {
      expect(shouldFetchBambooTimeOff({ force: false, nowMs: t0 + offset })).toBe(
        false,
      );
      expect(isBambooTimeOffFresh(t0 + offset)).toBe(true);
    }
    expect(getBambooTimeOffCache()?.entries).toHaveLength(1);
  });

  it("C. Bamboo refreshes after 60-minute TTL", () => {
    const t0 = 2_000_000;
    noteBambooTimeOffFetched([], t0);
    expect(shouldFetchBambooTimeOff({ force: false, nowMs: t0 + BAMBOO_TTL_MS - 1 })).toBe(
      false,
    );
    expect(shouldFetchBambooTimeOff({ force: false, nowMs: t0 + BAMBOO_TTL_MS })).toBe(
      true,
    );
  });

  it("D. manual / forced refresh bypasses Bamboo TTL", () => {
    noteBambooTimeOffFetched([], Date.now());
    expect(shouldFetchBambooTimeOff({ force: true })).toBe(true);
    expect(shouldFetchBambooTimeOff({ force: false })).toBe(false);
  });

  it("E. resume <15m does not refresh", () => {
    const now = Date.now();
    const recent = new Date(now - PERFORMANCE_BACKGROUND_INTERVAL_MS + 60_000).toISOString();
    expect(shouldRefreshOnSystemResume(recent, now)).toBe(false);
  });

  it("F. resume >=15m refreshes once (gate returns true)", () => {
    const now = Date.now();
    const stale = new Date(now - PERFORMANCE_BACKGROUND_INTERVAL_MS).toISOString();
    expect(shouldRefreshOnSystemResume(stale, now)).toBe(true);
    expect(shouldRefreshOnSystemResume(null, now)).toBe(true);
  });
});
