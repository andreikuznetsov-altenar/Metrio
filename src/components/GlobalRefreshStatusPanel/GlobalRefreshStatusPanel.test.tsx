// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalRefreshStatusPanel } from "./GlobalRefreshStatusPanel";
import { GLOBAL_REFRESH_STATUS_COPY } from "../../app/globalRefreshStatus";

const refresh = vi.fn(async () => undefined);
const performanceState = {
  refreshFailedWithUsableCache: false,
  viewModels: { teamOverview: {} } as unknown,
  data: { lastUpdatedAt: "2026-10-03T07:00:00.000Z" } as unknown,
  status: "ready" as const,
  uiState: "ready" as const,
  performanceLastUpdatedAt: "2026-10-03T07:00:00.000Z",
  refresh,
};

vi.mock("../../app/PerformanceDataContext", () => ({
  useOptionalPerformanceData: () => performanceState,
}));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  performanceState.refreshFailedWithUsableCache = false;
  performanceState.viewModels = { teamOverview: {} };
  performanceState.data = { lastUpdatedAt: "2026-10-03T07:00:00.000Z" };
  performanceState.status = "ready";
  performanceState.uiState = "ready";
});

beforeEach(() => {
  vi.useRealTimers();
});

describe("GlobalRefreshStatusPanel", () => {
  it("A: cached usable data + successful refresh → no error panel", () => {
    render(<GlobalRefreshStatusPanel />);
    expect(screen.queryByTestId("global-refresh-status-panel")).toBeNull();
  });

  it("B: cached usable data + refresh failure → one global bottom panel", () => {
    performanceState.refreshFailedWithUsableCache = true;
    performanceState.status = "partial";
    performanceState.uiState = "stale";
    render(<GlobalRefreshStatusPanel />);
    expect(screen.getAllByTestId("global-refresh-status-panel")).toHaveLength(1);
    expect(screen.getByText(GLOBAL_REFRESH_STATUS_COPY)).toBeTruthy();
    expect(screen.queryByText(/Couldn't refresh performance data/i)).toBeNull();
    expect(screen.getByTestId("global-refresh-status-retry")).toBeTruthy();
  });

  it("D: Retry success enters exiting state then unmounts", async () => {
    vi.useFakeTimers();
    performanceState.refreshFailedWithUsableCache = true;
    performanceState.status = "partial";
    performanceState.uiState = "stale";
    const { rerender } = render(<GlobalRefreshStatusPanel />);
    const panel = screen.getByTestId("global-refresh-status-panel");
    expect(panel.getAttribute("data-phase")).toMatch(/enter|visible/);

    performanceState.refreshFailedWithUsableCache = false;
    performanceState.status = "ready";
    performanceState.uiState = "ready";
    rerender(<GlobalRefreshStatusPanel />);
    expect(screen.getByTestId("global-refresh-status-panel").getAttribute("data-phase")).toBe(
      "exit",
    );

    await act(async () => {
      vi.advanceTimersByTime(240);
    });
    expect(screen.queryByTestId("global-refresh-status-panel")).toBeNull();
  });

  it("E: Retry failure keeps a single stable panel", () => {
    performanceState.refreshFailedWithUsableCache = true;
    performanceState.status = "partial";
    performanceState.uiState = "stale";
    const { rerender } = render(<GlobalRefreshStatusPanel />);
    fireEvent.click(screen.getByTestId("global-refresh-status-retry"));
    expect(refresh).toHaveBeenCalledTimes(1);
    rerender(<GlobalRefreshStatusPanel />);
    expect(screen.getAllByTestId("global-refresh-status-panel")).toHaveLength(1);
    expect(screen.getByTestId("global-refresh-status-panel").getAttribute("data-phase")).not.toBe(
      "hidden",
    );
  });

  it("F: no usable data + initial fetch failure does not show the cached-data panel", () => {
    performanceState.refreshFailedWithUsableCache = false;
    performanceState.viewModels = null;
    performanceState.data = null;
    performanceState.status = "error";
    performanceState.uiState = "error";
    render(<GlobalRefreshStatusPanel />);
    expect(screen.queryByTestId("global-refresh-status-panel")).toBeNull();
  });
});
