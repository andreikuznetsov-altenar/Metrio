import { describe, expect, it } from "vitest";
import {
  getEarliestFetchDate,
  getHistoryFetchDateFrom,
  requiredHistoryDaySpan,
} from "./historyRanges";
import { HISTORICAL_BOOTSTRAP_VERSION } from "./constants";

describe("historyRanges", () => {
  it("covers current and previous 6-month windows for Jira fetch", () => {
    const from = "2025-09-01";
    const to = "2026-03-04";
    const span = requiredHistoryDaySpan(from, to);
    expect(span).toBeGreaterThanOrEqual(360);
    const fetchFrom = getHistoryFetchDateFrom(to, from);
    expect(fetchFrom < from).toBe(true);
    expect(getEarliestFetchDate(from, to)).toBe(fetchFrom);
  });

  it("bumps bootstrap version for incompatible persisted snapshots", () => {
    expect(HISTORICAL_BOOTSTRAP_VERSION).toBeGreaterThanOrEqual(4);
  });
});
