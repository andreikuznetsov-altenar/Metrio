import { describe, expect, it } from "vitest";
import { shouldShowGlobalRefreshStatusPanel } from "./globalRefreshStatus";

describe("shouldShowGlobalRefreshStatusPanel", () => {
  it("hides when cached data refresh succeeds", () => {
    expect(
      shouldShowGlobalRefreshStatusPanel({
        refreshFailedWithUsableCache: false,
        hasUsableData: true,
        status: "ready",
        uiState: "ready",
      }),
    ).toBe(false);
  });

  it("shows when cached usable data remains after a failed refresh", () => {
    expect(
      shouldShowGlobalRefreshStatusPanel({
        refreshFailedWithUsableCache: true,
        hasUsableData: true,
        status: "partial",
        uiState: "stale",
      }),
    ).toBe(true);
  });

  it("does not replace a blocking first-run error with the cached-data panel", () => {
    expect(
      shouldShowGlobalRefreshStatusPanel({
        refreshFailedWithUsableCache: false,
        hasUsableData: false,
        status: "error",
        uiState: "error",
      }),
    ).toBe(false);
    expect(
      shouldShowGlobalRefreshStatusPanel({
        refreshFailedWithUsableCache: true,
        hasUsableData: false,
        status: "error",
        uiState: "error",
      }),
    ).toBe(false);
  });
});
