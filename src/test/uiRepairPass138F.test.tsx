// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardWorkspaceLoadingState } from "../pages/home/dashboard/DashboardWorkspaceLoadingState";
import { resolveDashboardDataHealth } from "../domain/home/dashboardDataHealth";

describe("UI Repair Pass 13.8F-0 cold start loading", () => {
  it("dashboard workspace loading exposes home-loading test id", () => {
    render(<DashboardWorkspaceLoadingState />);
    expect(screen.getByTestId("home-loading")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-workspace-loading")).toBeInTheDocument();
    expect(document.querySelector(".home-skeleton")).toBeNull();
  });

  it("initial_loading health is distinct from empty cold start", () => {
    const loading = resolveDashboardDataHealth({
      hasEverSuccessfulSnapshot: false,
      hasUsableDashboardData: false,
      refreshing: true,
      stale: false,
      errorMessage: null,
      refreshStartedAt: Date.now(),
      now: Date.now(),
    });
    expect(loading.state).toBe("initial_loading");

    const empty = resolveDashboardDataHealth({
      hasEverSuccessfulSnapshot: false,
      hasUsableDashboardData: false,
      refreshing: false,
      stale: false,
      errorMessage: null,
      refreshStartedAt: null,
      now: Date.now(),
    });
    expect(empty.state).toBe("cold_start");
    expect(loading.state).toBe("initial_loading");
    expect(loading.state).not.toBe(empty.state);
  });

  it("ready health follows successful hydration", () => {
    const ready = resolveDashboardDataHealth({
      hasEverSuccessfulSnapshot: true,
      hasUsableDashboardData: true,
      refreshing: false,
      stale: false,
      errorMessage: null,
      refreshStartedAt: null,
      now: Date.now(),
    });
    expect(ready.state).toBe("ready");
  });

  it("blocking error health is distinct from loading", () => {
    const error = resolveDashboardDataHealth({
      hasEverSuccessfulSnapshot: false,
      hasUsableDashboardData: false,
      refreshing: false,
      stale: false,
      errorMessage: "Jira unavailable",
      refreshStartedAt: null,
      now: Date.now(),
    });
    expect(error.state).toBe("refresh_failed_without_cache");
    expect(error.state).not.toBe("initial_loading");
  });
});
