// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "../components/Tooltip/Tooltip";
import { DashboardRecommendations } from "../pages/home/dashboard/DashboardRecommendations";
import { DirectorPerformanceSubnav } from "../pages/performance/director/DirectorPerformanceSubnav";
import { TeamPerformanceSubnav } from "../pages/performance/TeamPerformanceSubnav";
import { LeadershipBranchesPerformanceView } from "../pages/performance/director/LeadershipBranchesPerformanceView";
import { EmployeeWorkHistoryView } from "../pages/performance/EmployeeWorkHistoryView";
import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";
import type { LeadershipBranchPerformanceRow } from "../domain/organization/leadershipBranchPerformanceRows";
import type { LeadershipBranchMemberRow } from "../domain/organization/leadershipBranchMemberRows";

vi.mock("../app/PerformanceExportContext", () => ({
  usePerformanceExport: () => ({ registerWorkHistoryPeriod: vi.fn() }),
}));

const css = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const perfCss = css("../pages/performance/performance-dashboard.css");
const execCss = css("../pages/home/dashboard/executive-dashboard-pass10.css");
const rowCss = css("../pages/performance/analytics-issue-row.css");

function rec(id: string): ProductRecommendation {
  return {
    id,
    severity: "critical",
    title: `Title ${id}`,
    explanation: `Explanation ${id}`,
    actionLabel: "Open Delivery Risk",
    actionKind: "open_performance",
    priority: 1,
  };
}

describe("PASS31 Work history", () => {
  const props = {
    personId: "p1",
    personName: "Maya Bennett",
    historyWeek: [],
    historyQuarter: [],
    historyMonth: [
      {
        label: "2026-10",
        completedCount: 2,
        firstPassCount: 1,
        reviewReturns: 1,
        rows: [
          { key: "CAS-232", title: "Update provider filter chips", project: "CAS", completedOn: "12 Oct 2026", cycle: "3d 1h", outcome: "First Pass", firstPass: true },
          { key: "CORE-4821", title: "Improve bet slip error recovery", project: "CORE", completedOn: "7 Oct 2026", cycle: "10d 1h", outcome: "Rework", firstPass: false },
        ],
      },
    ],
  };

  it("has no heading, tabs left, period right, card rows", () => {
    const { container } = render(
      <TooltipProvider>
        <EmployeeWorkHistoryView {...props} />
      </TooltipProvider>,
    );
    expect(screen.queryByText(/^work history$/i)).toBeNull();
    const controls = container.querySelector(".work-history__controls")!;
    const kids = Array.from(controls.children);
    expect(kids[0]?.getAttribute("aria-label") ?? kids[0]?.textContent).toMatch(/History outcome filter|All/);
    expect(within(controls as HTMLElement).getByText("All")).toBeTruthy();
    expect(controls.lastElementChild?.className).toMatch(/select|history-period/);
    expect(screen.getAllByTestId("person-history-card")).toHaveLength(2);
    expect(container.querySelector(".work-history__list")).toBeTruthy();
  });

  it("CSS contract: 8px gap, no dividers, spacing before cards", () => {
    expect(perfCss).toMatch(/\.work-history__list\s*\{[^}]*gap:\s*8px/);
    expect(rowCss).toMatch(/\.analytics-issue-row--card\s*\{[^}]*border:\s*1px solid/);
    expect(perfCss).not.toMatch(/\.work-history[^{]*\{[^}]*border-bottom:\s*none/);
    expect(perfCss).toMatch(/\.work-history__controls\s*\{[^}]*justify-content:\s*space-between/);
    expect(perfCss).toMatch(/performance-subsection__summary\s*\{[^}]*margin-bottom:\s*var\(--space-5\)/);
  });
});

describe("PASS31 Single attention card", () => {
  it("single card uses the full-width layout; multiple keep the grid", () => {
    const { container, rerender } = render(
      <DashboardRecommendations items={[rec("a")]} onAction={vi.fn()} />,
    );
    expect(container.querySelector(".executive-recommendations__list--single")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Delivery Risk" })).toBeTruthy();
    rerender(<DashboardRecommendations items={[rec("a"), rec("b")]} onAction={vi.fn()} />);
    expect(container.querySelector(".executive-recommendations__list--single")).toBeNull();
  });

  it("CSS contract: CTA right and vertically centered", () => {
    expect(execCss).toMatch(/--single \.executive-recommendations__item\s*\{[^}]*flex-direction:\s*row/);
    expect(execCss).toMatch(/--single \.executive-recommendations__item\s*\{[^}]*align-items:\s*center/);
    expect(execCss).toMatch(/--single \.executive-recommendations__item\s*\{[^}]*justify-content:\s*space-between/);
  });
});

describe("PASS31 Paired modules", () => {
  it("CSS contract: compact grid stretches paired cards to equal height", () => {
    expect(perfCss).toMatch(/\.performance-director-compact-grid\s*\{[^}]*align-items:\s*stretch/);
    expect(perfCss).toMatch(/\.performance-director-compact-grid > \.performance-section\s*\{[^}]*height:\s*100%/);
  });
});

describe("PASS31 Manager navigation", () => {
  it("manager/director subnav has no People tab; team lead keeps People", () => {
    const { unmount } = render(<DirectorPerformanceSubnav activeView="teams" onChange={vi.fn()} />);
    const labels = screen.getAllByRole("button").map((b) => b.textContent?.trim());
    expect(labels).toEqual(["Overview", "Teams", "Signals", "Delivery"]);
    unmount();
    render(<TeamPerformanceSubnav activeView="overview" onChange={vi.fn()} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent?.trim())).toContain("People");
  });
});

describe("PASS31 Expandable teams", () => {
  const row = (id: string, name: string): LeadershipBranchPerformanceRow => ({
    leaderId: id,
    leaderName: name,
    leaderTitle: "Lead",
    peopleCount: 3,
    performanceLabel: "Healthy · 90% first pass",
    attentionLabel: "—",
    deliveryRiskCount: 0,
    capacityLabel: "2 Balanced",
    capacityParts: [{ label: "Balanced", value: 2 }],
    capacityMeasuredLabel: "2/2 measured",
    availabilityLabel: "—",
  });
  const member = (id: string, name: string): LeadershipBranchMemberRow => ({
    personId: id,
    displayName: name,
    jobTitle: "Product Designer",
    scopeLabel: "Team member",
    children: [],
    performanceLabel: "Healthy · 92% first pass",
    attentionLabel: "—",
    deliveryRiskCount: 0,
    capacityParts: [{ label: "Balanced", value: 1 }],
    availabilityLabel: "—",
  });

  it("starts collapsed, expands only the chosen lead, collapses again", async () => {
    render(
      <LeadershipBranchesPerformanceView
        rows={[row("l1", "Andrei Kuznetsov"), row("l2", "Marco Bellini")]}
        onSelectLeader={vi.fn()}
        onBack={vi.fn()}
        membersByLeaderId={{
          l1: [member("m1", "Maya Bennett"), member("m2", "Daria Petrova")],
          l2: [member("m3", "Chiara Romano")],
        }}
      />,
    );
    expect(screen.queryByText("Maya Bennett")).toBeNull();
    const chevrons = screen.getAllByRole("button", { name: /Expand .* team/ });
    expect(chevrons).toHaveLength(2);
    expect(chevrons[0].getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(chevrons[0]);
    expect(screen.getByText("Maya Bennett")).toBeTruthy();
    expect(screen.getByText("Daria Petrova")).toBeTruthy();
    expect(screen.queryByText("Chiara Romano")).toBeNull();
    const open = screen.getByRole("button", { name: /Collapse Andrei Kuznetsov's team/ });
    expect(open.getAttribute("aria-expanded")).toBe("true");
    // members render directly after their lead row
    const rows = screen.getAllByRole("row");
    const leadIdx = rows.findIndex((r) => within(r).queryByText("Andrei Kuznetsov"));
    expect(within(rows[leadIdx + 1]).getByText("Maya Bennett")).toBeTruthy();
    await userEvent.click(open);
    await waitFor(() => expect(screen.queryByText("Maya Bennett")).toBeNull());
  });
});
