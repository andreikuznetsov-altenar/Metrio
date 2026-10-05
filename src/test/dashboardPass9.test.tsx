// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  REFRESH_STUCK_MS,
  resolveDashboardDataHealth,
} from "../domain/home/dashboardDataHealth";
import { buildDirectorExecutiveModel, buildEmployeeExecutiveModel } from "../domain/home/executiveDashboardModel";
import { DashboardFirstRunState } from "../pages/home/dashboard/DashboardFirstRunState";
import { DashboardPrimaryTrend } from "../pages/home/dashboard/DashboardPrimaryTrend";

describe("Dashboard Pass 9", () => {
  it("cold start shows Open Performance without KPI strip", () => {
    render(<DashboardFirstRunState onOpenPerformance={() => undefined} />);
    expect(screen.getByTestId("dashboard-first-run")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Performance" })).toBeTruthy();
    expect(screen.queryByTestId("dashboard-kpi-strip")).toBeNull();
  });

  it("cached refresh keeps dashboard-ready health with usable data", () => {
    const health = resolveDashboardDataHealth({
      hasEverSuccessfulSnapshot: true,
      hasUsableDashboardData: true,
      refreshing: true,
      stale: true,
      errorMessage: null,
      refreshStartedAt: Date.now() - 5_000,
      now: Date.now(),
    });
    expect(health.state).toBe("refreshing");
  });

  it("marks refresh stuck after 60s watchdog", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
    const now = Date.now();
    const health = resolveDashboardDataHealth({
      hasEverSuccessfulSnapshot: true,
      hasUsableDashboardData: true,
      refreshing: true,
      stale: false,
      errorMessage: null,
      refreshStartedAt: now - REFRESH_STUCK_MS - 1,
      now,
    });
    expect(health.state).toBe("refresh_stuck");
    vi.useRealTimers();
  });

  it("director model is organization-first and not manager-first", () => {
    const model = buildDirectorExecutiveModel({
      focus: [],
      teamActions: [],
      teamSnapshot: { summary: [], workload: [] },
      deliveryRiskCount: 0,
      deliverySummary: { problematic: 0, longReview: 0, backflowSignals: 0 },
      organization: {
        signalCount: 2,
        teamsNeedingAttention: 1,
        model: {
          scope: { mode: "organization", personIds: [], source: "authorized_org" },
          scopeLabel: "Organization",
          summary: [],
          teamTrends: [],
          teamsNeedingAttention: [],
          signals: [],
          teams: [],
          deliveryRisk: [],
          teamCapacity: [],
          newStarterSummary: { total: 0, byTeam: [] },
          feedbackSummary: {
            pendingRecipients: 0,
            deliveryFailures: 0,
            preparedNotSent: false,
          },
        },
      },
      trends: [],
    });
    expect(model.organizationFirst).toBe(true);
    expect(model).not.toHaveProperty("managerFirst");
    expect(model.scopeLabel).toBe("Organization");
  });

  it("expands trend to 12 columns when attention is empty", () => {
    const model = buildEmployeeExecutiveModel({
      performanceSnapshot: { metrics: [] },
      selfWorkload: null,
      focus: [],
      trends: [{ label: "Completed", value: "3", chartSeries: [], insufficientHistory: true }],
    });
    expect(model.trendSpanClass).toBe("executive-dashboard__span-12");
    const { container } = render(
      <DashboardPrimaryTrend trends={model.trends} spanClass={model.trendSpanClass} />,
    );
    expect(container.querySelector(".executive-dashboard__span-12")).toBeTruthy();
  });
});
