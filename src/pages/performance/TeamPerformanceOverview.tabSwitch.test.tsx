// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAppNavigationStateForTests } from "../../app/navigationStore";
import type { TeamPerformanceSnapshot } from "../../domain/performance";
import { TeamPerformanceOverview } from "./TeamPerformanceOverview";

const fetchPerformanceData = vi.fn();
const viewRenders = vi.hoisted(() => ({ overview: 0, radar: 0, risk: 0 }));

vi.mock("../../services/performance/performanceDataService", () => ({
  fetchPerformanceData: (...args: unknown[]) => fetchPerformanceData(...args),
}));

vi.mock("./TeamOverviewView", () => ({
  TeamOverviewView: () => {
    viewRenders.overview += 1;
    return null;
  },
}));
vi.mock("./TeamPeopleView", () => ({
  TeamPeopleView: () => null,
}));
vi.mock("./TeamRadarView", () => ({
  TeamRadarView: () => {
    viewRenders.radar += 1;
    return null;
  },
}));
vi.mock("./TeamDeliveryRiskView", () => ({
  TeamDeliveryRiskView: () => {
    viewRenders.risk += 1;
    return null;
  },
}));
vi.mock("./EmployeeGoalsView", () => ({
  EmployeeGoalsView: () => null,
}));
vi.mock("./HistoryReportsView", () => ({
  HistoryReportsView: () => null,
}));

vi.mock("../../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: { person: { id: "self-person" } },
  }),
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

const stableViewModels = {
  teamOverview: snapshot,
  teamSecondary: { people: [], radar: [], deliveryRisk: [] },
};

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    uiState: "ready",
    viewModels: stableViewModels,
  }),
}));

afterEach(() => {
  cleanup();
  resetAppNavigationStateForTests();
  viewRenders.overview = 0;
  viewRenders.radar = 0;
  viewRenders.risk = 0;
});

describe("TeamPerformanceOverview internal tabs", () => {
  it("updates the active tab immediately without fetching or keeping hidden views", async () => {
    const user = userEvent.setup();
    resetAppNavigationStateForTests({ route: "performance", performanceView: "overview" });
    render(
      <TeamPerformanceOverview onOpenPerson={() => undefined} reviewTarget="team" />,
    );
    expect(screen.getByRole("button", { name: /^Overview$/i })).toHaveClass("is-active");
    expect(screen.getByTestId("performance-view-overview")).toBeTruthy();
    expect(screen.queryByTestId("performance-view-radar")).toBeNull();
    const overviewRendersWhileVisible = viewRenders.overview;
    expect(overviewRendersWhileVisible).toBeGreaterThan(0);
    expect(viewRenders.radar).toBe(0);

    await user.click(screen.getByRole("button", { name: /^Radar$/i }));
    expect(screen.getByRole("button", { name: /^Radar$/i })).toHaveClass("is-active");
    expect(screen.getByTestId("performance-view-radar")).toBeTruthy();
    expect(screen.queryByTestId("performance-view-overview")).toBeNull();
    expect(viewRenders.radar).toBeGreaterThan(0);
    expect(viewRenders.overview).toBe(overviewRendersWhileVisible);

    await user.click(screen.getByRole("button", { name: /^Delivery Risk$/i }));
    expect(screen.getByRole("button", { name: /^Delivery Risk$/i })).toHaveClass("is-active");
    expect(screen.getByTestId("performance-view-delivery-risk")).toBeTruthy();
    expect(screen.queryByTestId("performance-view-radar")).toBeNull();
    expect(viewRenders.risk).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^Overview$/i }));
    expect(screen.getByRole("button", { name: /^Overview$/i })).toHaveClass("is-active");
    expect(fetchPerformanceData).not.toHaveBeenCalled();
  });
});
