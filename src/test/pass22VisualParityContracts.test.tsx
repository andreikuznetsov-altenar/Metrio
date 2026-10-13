// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardYourManagerCard } from "../pages/home/dashboard/DashboardYourManagerCard";
import { TeamPeopleView } from "../pages/performance/TeamPeopleView";
import { LeadershipBranchesPerformanceView } from "../pages/performance/director/LeadershipBranchesPerformanceView";
import type { TeamPeopleRow } from "../domain/performance";

vi.mock("../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({ data: { teamSnapshot: { persons: [] } } }),
}));

vi.mock("../platform/preferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../platform/preferences")>()),
  loadPreferences: async () => ({}),
}));

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const peopleRow: TeamPeopleRow = {
  personId: "person-1",
  personName: "Maria Camilleri",
  role: "UX Designer",
  efficiency: "88%",
  attentionSeverityLabel: "Stable",
  attentionReason: "No attention signals",
  attentionVariant: "success",
  attentionIssueKeys: [],
  availability: "Available",
  workload: "Light",
};

afterEach(() => {
  cleanup();
});

describe("PASS 22 visual parity contracts", () => {
  it("renders manager identity with the shared avatar/name/title primitive", () => {
    render(
      <DashboardYourManagerCard
        manager={{
          id: "manager-7",
          displayName: "Maria Camilleri",
          firstName: "Maria",
          lastName: "Camilleri",
          workEmail: "maria@example.test",
          jobTitle: "UX Team Lead",
          department: "Design",
          status: "Active",
        }}
      />,
    );

    expect(screen.getByTestId("person-avatar")).toBeInTheDocument();
    expect(screen.getByText("Maria Camilleri").closest(".person-identity")).toBeTruthy();
    expect(screen.getByText("UX Team Lead")).toHaveClass("person-identity__role");
    expect(screen.getByTestId("dashboard-your-manager")).toHaveClass("executive-panel");
  });

  it("uses the same identity primitive in People and Leadership tables", () => {
    const { rerender } = render(
      <TeamPeopleView rows={[peopleRow]} onOpenPerson={vi.fn()} />,
    );

    expect(screen.getByText("Maria Camilleri").closest(".person-identity")).toBeTruthy();
    expect(screen.getByText("UX Designer")).toHaveClass("person-identity__role");

    rerender(
      <LeadershipBranchesPerformanceView
        rows={[
          {
            leaderId: "lead-1",
            leaderName: "Andrei Morozov",
            leaderTitle: "UX Team Lead",
            peopleCount: 4,
            performanceLabel: "Healthy",
            attentionLabel: "Stable",
            deliveryRiskCount: 0,
            capacityLabel: "Light",
            capacityParts: [{ label: "Light", value: 4 }],
            availabilityLabel: "Available",
          },
        ]}
        onSelectLeader={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("Andrei Morozov").closest(".person-identity")).toBeTruthy();
    expect(screen.getByText("UX Team Lead")).toHaveClass("person-identity__role");
  });

  it("keeps compact role modules on canonical dashboard grid rows", () => {
    const employee = source("src/pages/home/dashboard/EmployeeExecutiveDashboard.tsx");
    const director = source("src/pages/home/dashboard/DirectorExecutiveDashboard.tsx");

    expect(employee).toMatch(
      /span-12">\s*<DashboardYourManagerCard/,
    );
    expect(director).toContain("<DashboardMetricsPair>");
    expect(director).toContain("<DashboardLowerThreeCards>");
    expect(director).not.toContain('className="executive-secondary-line executive-dashboard__span-12"');
  });

  it("keeps canonical Team Lead composition primitives present and unforked", () => {
    const manager = source("src/pages/home/dashboard/ManagerExecutiveDashboard.tsx");

    expect(manager).toContain("<DashboardKpiStrip");
    expect(manager).toContain("<DashboardMetricsPair>");
    expect(manager).toContain("<DashboardLowerThreeCards>");
    expect(manager).not.toContain("manager-only-kpi");
  });

  it("contains employee performance scope data inside the canonical scope strip", () => {
    const employeePerformance = source(
      "src/pages/performance/EmployeePerformanceOverview.tsx",
    );
    const css = source("src/pages/performance/performance-dashboard.css");

    expect(employeePerformance).toContain("performance-scope-strip");
    expect(employeePerformance).toContain("performance-scope-strip__eyebrow");
    expect(css).toContain(".performance-scope-strip");
    expect(css).toContain("border: 1px solid var(--color-border-subtle)");
    expect(css).toContain("border-radius: var(--radius-card)");
  });
});
