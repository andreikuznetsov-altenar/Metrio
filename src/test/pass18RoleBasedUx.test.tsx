// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardEmployeeWorkSummary } from "../pages/home/dashboard/DashboardEmployeeWorkSummary";
import { DirectorOverviewView } from "../pages/performance/director/DirectorOverviewView";
import { LeadershipBranchesPerformanceView } from "../pages/performance/director/LeadershipBranchesPerformanceView";
import {
  canUseFeedback,
  resolveOrgFeatureAccessForUser,
} from "../domain/organization/orgFeatureAccess";
import {
  buildDocPerformanceFetchResult,
  getDocFixtureUser,
} from "../fixtures/docFixtureData";
import type { OrganizationOverviewModel } from "../domain/organization/organizationTypes";

vi.mock("../platform/openExternal", () => ({
  openExternalUrl: vi.fn(async () => undefined),
}));

describe("PASS 18 role-based UX", () => {
  it("allows Feedback only for a leaf lead with direct IC reports", () => {
    const maria = getDocFixtureUser("ic");
    const andrei = getDocFixtureUser("lead");
    const andreas = getDocFixtureUser("manager");
    const nikolai = getDocFixtureUser("director");

    expect(canUseFeedback(maria)).toBe(false);
    expect(canUseFeedback(andrei)).toBe(true);
    expect(canUseFeedback(andreas)).toBe(false);
    expect(canUseFeedback(nikolai)).toBe(false);
    expect(resolveOrgFeatureAccessForUser(maria).showFeedbackTab).toBe(false);
    expect(resolveOrgFeatureAccessForUser(andrei).showFeedbackTab).toBe(true);
  });

  it("keeps feedback direct navigation protected by the shared access source", () => {
    const appLayout = readFileSync("src/app/AppLayout.tsx", "utf8");
    const feedbackPage = readFileSync("src/pages/feedback/FeedbackPage.tsx", "utf8");

    expect(appLayout).toContain("resolveOrgFeatureAccessForUser(currentUser)");
    expect(appLayout).toContain('route === "feedback" && !feedbackEnabled');
    expect(feedbackPage).toContain("resolveOrgFeatureAccessForUser(currentUser)");
    expect(feedbackPage).toContain("appNavigate({ route: 'home' })");
  });

  it("renders employee dashboard as three equal work modules plus separate resources", () => {
    render(
      <DashboardEmployeeWorkSummary
        trends={[{ label: "Completed", value: "6", chartSeries: [] }]}
        metrics={[
          { label: "First pass", value: "84%" },
          { label: "Backflows", value: "2" },
          { label: "Avg cycle", value: "3.1d" },
        ]}
        workload={{
          level: "normal",
          score: 40,
          activeCount: 3,
          inProgressCount: 2,
          inReviewCount: 1,
          problematicCount: 0,
          atRiskCount: 0,
          overdueCount: 0,
          summary: "Normal",
          activeWorkCount: 2,
          reviewCount: 1,
          holdCount: 1,
        }}
        resources={[
          {
            id: "resource-1",
            title: "Design handbook",
            url: "https://example.com/design",
            contextLabel: "Confluence",
          },
        ]}
        onOpenResource={vi.fn()}
      />,
    );

    expect(screen.getByTestId("employee-dashboard-work-summary")).toBeInTheDocument();
    expect(screen.getByTestId("employee-dashboard-trend-card")).toBeInTheDocument();
    expect(screen.getByTestId("employee-dashboard-current-work-card")).toBeInTheDocument();
    expect(screen.getByTestId("employee-dashboard-delivery-quality-card")).toBeInTheDocument();
    expect(screen.getByTestId("employee-dashboard-resources")).toHaveTextContent("Design handbook");
  });

  it("renders manager/director performance overview with canonical sections", () => {
    const team = {
      teamId: "team-design",
      teamName: "Design",
      peopleCount: 4,
      activeWork: 8,
      attentionCount: 2,
      completed: 31,
      firstPassPercent: 84,
      avgCycleLabel: "3.0d",
      upcomingLeave: 1,
      attentionSeverity: 2,
      capacitySummaryLabel: "1 Heavy · 2 Balanced · 1 Light",
      deliveryRiskCount: 1,
    };
    const model: OrganizationOverviewModel = {
      scope: { mode: "organization", personIds: ["doc-andrei"], source: "authorized_org" },
      scopeLabel: "Design organization",
      summary: [
        { label: "Efficiency", value: "88%" },
        { label: "First pass", value: "84%" },
        { label: "Completed", value: "31" },
        { label: "Backflows", value: "4" },
      ],
      teamTrends: [{ teamId: team.teamId, teamName: team.teamName, label: "First pass improving" }],
      teamsNeedingAttention: [team],
      teams: [team],
      signals: [
        {
          id: "signal-1",
          teamId: team.teamId,
          teamName: team.teamName,
          kind: "delivery_risk_concentration",
          severity: "warning",
          title: "Review concentration",
          description: "Review is concentrated in one team.",
          target: { kind: "performance", view: "delivery-risk" },
        },
      ],
      deliveryRisk: [],
      teamCapacity: [
        { teamId: team.teamId, teamName: team.teamName, peopleTotal: 4, awayNextWeek: 1, label: "1 away next week" },
      ],
      newStarterSummary: { total: 0, byTeam: [] },
      feedbackSummary: { pendingRecipients: 0, deliveryFailures: 0, preparedNotSent: false },
    };

    render(<DirectorOverviewView model={model} onOpenSignal={vi.fn()} onOpenTeams={vi.fn()} />);

    expect(screen.getByTestId("director-scope-header")).toBeInTheDocument();
    expect(screen.getByTestId("director-kpi-row")).toHaveTextContent("Efficiency");
    expect(screen.getByText("Teams needing attention")).toBeInTheDocument();
    expect(screen.getByText("Team trends")).toBeInTheDocument();
    expect(screen.getByText("Signals")).toBeInTheDocument();
  });

  it("renders leadership People rows with avatar identity and structured capacity", () => {
    render(
      <LeadershipBranchesPerformanceView
        rows={[
          {
            leaderId: "doc-andrei",
            leaderName: "Andrei Morozov",
            leaderTitle: "UX Team Lead",
            peopleCount: 4,
            performanceLabel: "Healthy · 84% first pass",
            attentionLabel: "1 watch",
            deliveryRiskCount: 1,
            capacityLabel: "1 Heavy · 2 Balanced · 1 Light",
            capacityParts: [
              { label: "Heavy", value: 1 },
              { label: "Balanced", value: 2 },
              { label: "Light", value: 1 },
            ],
            capacityMeasuredLabel: "4/4 measured",
            availabilityLabel: "—",
          },
        ]}
        onSelectLeader={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByTestId("person-avatar")).toBeInTheDocument();
    expect(screen.getByText("Andrei Morozov")).toBeInTheDocument();
    expect(screen.getByText("UX Team Lead")).toBeInTheDocument();
    expect(screen.getByText("Heavy: 1")).toBeInTheDocument();
    expect(screen.getByText("4/4 measured")).toBeInTheDocument();
  });

  it("keeps documentation fixtures meaningful and manager hierarchy free of direct IC reports", () => {
    const manager = getDocFixtureUser("manager");
    const managerResult = buildDocPerformanceFetchResult("manager", "30d", "team", "team");
    const directorResult = buildDocPerformanceFetchResult("director", "30d", "team", "team");

    expect(manager.orgHierarchy?.directIndividualContributorIds).toEqual([]);
    expect(managerResult.reportData.teamKpi.efficiencyIndex).toBe(88);
    expect(managerResult.reportData.teamKpi.completedCount).toBe(31);
    expect(managerResult.reportData.teamKpi.backflowCount).toBe(4);
    expect(directorResult.reportData.teamKpi.efficiencyIndex).toBe(91);
    expect(directorResult.reportData.teamKpi.completedCount).toBe(76);
    expect(directorResult.reportData.teamKpi.backflowCount).toBe(7);
  });
});
