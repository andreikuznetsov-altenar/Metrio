import { describe, expect, it } from "vitest";
import { derivePerformanceUiState } from "./performanceUiState";

describe("derivePerformanceUiState", () => {
  it("maps initial load to initial-loading", () => {
    expect(
      derivePerformanceUiState({ status: "loading", viewModels: null, stale: false }),
    ).toBe("initial-loading");
  });

  it("maps refresh with data to refreshing", () => {
    expect(
      derivePerformanceUiState({
        status: "refreshing",
        viewModels: {},
        stale: false,
      }),
    ).toBe("refreshing");
  });

  it("maps stale partial refresh failure", () => {
    expect(
      derivePerformanceUiState({
        status: "partial",
        viewModels: {},
        stale: true,
      }),
    ).toBe("stale");
  });
});
