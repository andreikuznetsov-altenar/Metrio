// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamPerformanceSnapshot } from "../../domain/performance";
import { TeamPerformanceOverview } from "./TeamPerformanceOverview";

const fetchPerformanceData = vi.fn();

vi.mock("../../services/performance/performanceDataService", () => ({
  fetchPerformanceData: (...args: unknown[]) => fetchPerformanceData(...args),
}));

vi.mock("./TeamOverviewView", () => ({
  TeamOverviewView: () => null,
}));
vi.mock("./TeamPeopleView", () => ({
  TeamPeopleView: () => null,
}));
vi.mock("./TeamRadarView", () => ({
  TeamRadarView: () => null,
}));
vi.mock("./TeamDeliveryRiskView", () => ({
  TeamDeliveryRiskView: () => null,
}));
vi.mock("./ManagerGoalsView", () => ({
  ManagerGoalsView: () => null,
}));
vi.mock("./HistoryReportsView", () => ({
  HistoryReportsView: () => null,
}));

vi.mock("../../app/PerformanceExportContext", () => ({
  usePerformanceExport: () => ({ registerTeamView: () => undefined }),
}));

vi.mock("../../app/performanceAnalyticsContext", () => ({
  usePerformanceAnalytics: () => ({
    openTeamMetricDrilldown: () => undefined,
    openTeamTrendDrilldown: () => undefined,
  }),
}));

const snapshot: TeamPerformanceSnapshot = {
  directReportIds: [],
  summary: [],
  attention: [],
  attentionTotalCount: 0,
  trends: [],
  workload: [],
  timeOff: [],
  personDetails: {},
};

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    uiState: "ready",
    viewModels: {
      teamOverview: snapshot,
      teamSecondary: { people: [], radar: [], deliveryRisk: [] },
    },
  }),
}));

afterEach(() => cleanup());

describe("TeamPerformanceOverview internal tabs", () => {
  it("updates the active tab immediately without fetching", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("metrio.performance.teamView.v1", "overview");
    render(
      <TeamPerformanceOverview onOpenPerson={() => undefined} reviewTarget="team" />,
    );
    expect(screen.getByTestId("performance-view-overview")).not.toHaveAttribute("hidden");

    await user.click(screen.getByRole("button", { name: /^Radar$/i }));
    expect(screen.getByRole("button", { name: /^Radar$/i })).toHaveClass("is-active");
    expect(screen.getByTestId("performance-view-radar")).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("performance-view-overview")).toHaveAttribute("hidden");

    await user.click(screen.getByRole("button", { name: /^Delivery Risk$/i }));
    expect(screen.getByRole("button", { name: /^Delivery Risk$/i })).toHaveClass("is-active");
    expect(screen.getByTestId("performance-view-delivery-risk")).not.toHaveAttribute(
      "hidden",
    );

    await user.click(screen.getByRole("button", { name: /^Overview$/i }));
    expect(screen.getByRole("button", { name: /^Overview$/i })).toHaveClass("is-active");
    expect(fetchPerformanceData).not.toHaveBeenCalled();
  });
});
