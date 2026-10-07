import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.8D performance blocks and team brief donut", () => {
  it("removes outer Recent performance wrapper card", () => {
    const source = read("src/pages/performance/PersonBriefDrawer.tsx");
    expect(source).toContain('data-testid="person-brief-recent-performance"');
    expect(source).toContain("person-brief__performance");
    expect(source).not.toContain(
      'className="person-brief__section-card">\n        <h3 className="person-brief__section-title">Recent performance',
    );
  });

  it("styles brief KPI grid as surface cards on panel background", () => {
    const css = read("src/pages/performance/person-brief-drawer.css");
    expect(css).toContain(".person-brief__kpi-grid .performance-metric-card");
    expect(css).toContain("border: 1px solid var(--color-border)");
  });

  it("routes Open Team Workload to scroll target", () => {
    const overview = read("src/pages/performance/TeamOverviewView.tsx");
    expect(overview).toContain("navigateOpenTeamWorkloadSection");
    const nav = read("src/domain/home/attentionNavigation.ts");
    expect(nav).toContain("navigateOpenTeamWorkloadSection");
    expect(nav).toContain("performance-section-team-workload");
  });

  it("uses donut + detail layout without table", () => {
    const component = read("src/components/charts/TeamWorkloadDonut.tsx");
    expect(component).toContain("team-workload-donut__layout");
    expect(component).toContain("team-brief-workload-detail");
    expect(component).not.toContain("MetrioTableWrap");
    expect(component).not.toContain("Tooltip");
  });

  it("sources donut weights from shared workload helpers", () => {
    const component = read("src/components/charts/TeamWorkloadDonut.tsx");
    expect(component).toContain("buildTeamWorkloadDonutSegments");
    expect(component).toContain("selectDefaultTeamWorkloadDonutPersonId");
    expect(component).toContain("workloadDonutSupportingMetric");
  });

  it("disables recharts pie stroke so segments have no dark ring outline", () => {
    const component = read("src/components/charts/TeamWorkloadDonut.tsx");
    expect(component).toContain('stroke="none"');
  });
});
