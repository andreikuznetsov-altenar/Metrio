import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, useState, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PerformanceDataProvider,
  usePerformanceData,
} from "./PerformanceDataContext";
import { createPerformanceDateRange } from "../domain/performance/performanceDateRange";
import { performanceDataLifecycleEmptyResult } from "../test/helpers/performanceDataLifecycleEmptyResult";
import { clearDashboardCacheForTests } from "../platform/dashboard/dashboardCache";
import { setPendingTeamPerformanceView } from "./performanceViewPersistence";

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

function Wrapper({ children }: { children: ReactNode }) {
  return createElement(PerformanceDataProvider, {
    enabled: true,
    showLoadingOverlay: true,
    dateRange: createPerformanceDateRange("30d"),
    reviewTarget: "team",
    audience: "team",
    selfPersonId: "person-sam",
    managerTeamTray: true,
    children,
  });
}

function TabSwitchProbe() {
  const { status } = usePerformanceData();
  const [tab, setTab] = useState("overview");
  return createElement("div", null, [
    createElement("span", { key: "status", "data-testid": "status" }, status),
    createElement("span", { key: "tab", "data-testid": "active-tab" }, tab),
    createElement(
      "button",
      { key: "radar", type: "button", onClick: () => setTab("radar") },
      "Radar",
    ),
    createElement(
      "button",
      { key: "risk", type: "button", onClick: () => setTab("delivery-risk") },
      "Delivery Risk",
    ),
    createElement(
      "button",
      { key: "overview", type: "button", onClick: () => setTab("overview") },
      "Overview",
    ),
  ]);
}

describe("internal Performance tab switch does not fetch", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(performanceDataLifecycleEmptyResult());
    clearDashboardCacheForTests();
    setPendingTeamPerformanceView("overview");
  });

  it("keeps fetch count unchanged across Overview → Radar → Delivery Risk → Overview", async () => {
    const user = userEvent.setup();
    render(createElement(TabSwitchProbe), { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("ready"));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockClear();

    await user.click(screen.getByRole("button", { name: "Radar" }));
    expect(screen.getByTestId("active-tab").textContent).toBe("radar");
    await user.click(screen.getByRole("button", { name: "Delivery Risk" }));
    expect(screen.getByTestId("active-tab").textContent).toBe("delivery-risk");
    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByTestId("active-tab").textContent).toBe("overview");

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("provider stays ready without bootstrap rerun on rerender", async () => {
    const { result, rerender } = renderHook(() => usePerformanceData(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const calls = mockFetch.mock.calls.length;
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(calls);
    expect(result.current.status).toBe("ready");
  });
});
