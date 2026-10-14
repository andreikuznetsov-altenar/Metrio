// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function cssBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\}`))?.[0] ?? "";
}

describe("PASS 22.1 final visual consistency contracts", () => {
  it("keeps IC manager card bounded by the canonical executive panel", () => {
    const component = source("src/pages/home/dashboard/DashboardYourManagerCard.tsx");
    const css = source("src/pages/home/dashboard/dashboard-your-manager.css");

    expect(component).toContain("dashboard-your-manager executive-panel");
    expect(component).toContain("<PersonIdentity");
    // PASS34: the email is a plain inline text link, not a button control.
    expect(component).toMatch(/metrio-text-link[\s\S]{0,300}workEmail/);
    expect(component).not.toMatch(/variant="secondary"/);
    expect(cssBlock(css, ".dashboard-your-manager")).not.toContain("padding:");
  });

  it("uses canonical scope strip for employee performance context", () => {
    const component = source("src/pages/performance/EmployeePerformanceOverview.tsx");

    expect(component).toContain("<ScopeStrip");
    expect(component).toContain('eyebrow="Performance scope"');
    expect(source("src/components/ScopeStrip/ScopeStrip.tsx")).toContain("performance-scope-strip__title");
    expect(component).not.toContain("performance-employee-context");
  });

  it("renders Resources Open actions as secondary buttons", () => {
    const performance = source("src/pages/performance/EmployeePerformanceOverview.tsx");
    const dashboard = source("src/pages/home/dashboard/DashboardEmployeeWorkSummary.tsx");

    expect(performance).not.toMatch(/variant="ghost"[\s\S]{0,160}Open/);
    expect(dashboard).not.toMatch(/variant="ghost"[\s\S]{0,160}Open/);
    expect(performance).toMatch(/variant="secondary"[\s\S]{0,240}Open/);
    expect(performance).toContain("openOnboardingResourceTarget(resource.target)");
    expect(source("src/components/ResourceRow/ResourceRow.tsx")).toMatch(
      /variant="secondary"[\s\S]{0,200}Open/,
    );
    expect(source("src/components/ResourceRow/ResourceRow.css")).not.toContain("resource-row__action");
    expect(dashboard).toMatch(/variant="secondary"[\s\S]{0,160}Open/);
  });

  it("prevents Task Journey current marker halo from clipping at the timeline edge", () => {
    const css = source("src/components/TaskJourney/TaskJourneyDrawer.css");
    const timeline = cssBlock(css, ".task-journey-timeline");
    const currentDot = cssBlock(
      css,
      ".task-journey-timeline__item--current .task-journey-timeline__dot",
    );

    expect(timeline).toContain("--task-journey-marker-halo: 3px");
    expect(timeline).toContain("padding: 0 0 0 var(--task-journey-marker-halo)");
    expect(currentDot).toMatch(/box-shadow:\s*0 0 0 var\(--task-journey-marker-halo\)/);
  });

  it("keeps director scope horizontal and compacts adjacent overview modules", () => {
    const component = source("src/pages/performance/director/DirectorOverviewView.tsx");
    const css = source("src/pages/performance/performance-dashboard.css");
    const scope = cssBlock(source("src/components/ScopeStrip/ScopeStrip.css"), ".performance-scope-strip");

    expect(component).toContain("<ScopeStrip");
    expect(component).toContain("View all teams");
    expect(scope).toContain("display: flex");
    expect(scope).toContain("flex-direction: row");
    expect(scope).toContain("align-items: center");
    expect(scope).toContain("justify-content: space-between");
    expect(component).toContain("performance-director-compact-grid");
    expect(component).toContain("Upcoming team availability");
    expect(component).toContain("performance-section--compact-surface");
  });

  it("keeps Feedback cycle overview metrics equal and latest run bounded", () => {
    const component = source("src/pages/feedback/FeedbackCycleDetailView.tsx");
    const css = source("src/pages/feedback/feedback-ds.css");

    expect(component).toContain("<SegmentedControl");
    expect(component).toContain("ds-metric-grid ds-metric-grid--three");
    expect(component).toContain("<FeedbackResultsView metrics={latestMetrics}");
    expect(cssBlock(css, ".ds-metric-grid--three")).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr))",
    );
    expect(cssBlock(css, ".ds-metric-grid--four")).toContain(
      "grid-template-columns: repeat(4, minmax(0, 1fr))",
    );
    expect(cssBlock(css, ".feedback-latest-run")).toContain(
      "border: 1px solid var(--color-border-subtle)",
    );
  });

  it("keeps DatePicker trigger on the canonical field box model", () => {
    const css = source("src/components/DatePicker/MetrioDatePicker.css");
    const trigger = Array.from(
      css.matchAll(/\.metrio-date-picker__trigger\s*\{[\s\S]*?\}/g),
    )
      .map((match) => match[0])
      .find((block) => block.includes("display: inline-flex")) ?? "";

    expect(trigger).toContain("height: var(--control-height)");
    expect(trigger).toContain("box-sizing: border-box");
    expect(trigger).toContain("border: 1px solid var(--color-border)");
    expect(trigger).not.toMatch(/min-height:\s*(?:auto|\d+px)/);
  });

  it("moves long Feedback metric explanations out of equal-height metric cards", () => {
    const results = source("src/pages/feedback/FeedbackResultsView.tsx");
    const css = source("src/pages/feedback/feedback-ds.css");

    expect(results).not.toMatch(/<MetricCard[^>]*hint=/);
    expect(results).toContain("ds-metric-grid__help");
    expect(css).toContain(".ds-metric-grid__help");
    expect(cssBlock(css, ".feedback-latest-run__actions")).toContain("justify-content: flex-start");
  });

  it("keeps the stacked DatePicker trigger on the canonical field size (no flex collapse)", () => {
    const css = source("src/components/DatePicker/MetrioDatePicker.css");
    const stacked = cssBlock(css, ".metrio-date-picker--stacked .metrio-date-picker__trigger");
    const goalCss = source("src/pages/performance/goal-detail-drawer.css");
    const detail = source("src/pages/performance/BambooGoalDetailDrawer.tsx");

    expect(stacked).toContain("flex: 0 0 auto");
    expect(goalCss).not.toMatch(/metrio-date-picker/);
    expect(detail).toContain("<MetrioDatePicker");
    expect(detail).toContain('layout="stacked"');
    expect(detail).toContain('className="field__label">Progress');
    expect(detail).not.toContain("bamboo-goal-form__field");
  });

  it("keeps Director availability and adjacent compact modules on bounded surfaces", () => {
    const component = source("src/pages/performance/director/DirectorOverviewView.tsx");
    const grid = component.slice(component.indexOf("performance-director-compact-grid"));

    expect(grid).toContain('data-testid="director-upcoming-availability"');
    expect((grid.match(/performance-section--compact-surface/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(component).not.toMatch(/variant="ghost"[\s\S]{0,80}onOpenSignal/);
  });

  it("reuses person identity primitives for name + role displays", () => {
    const manager = source("src/pages/home/dashboard/DashboardYourManagerCard.tsx");
    const header = source("src/pages/performance/PersonIdentityHeader.tsx");
    const people = source("src/pages/performance/TeamPeopleView.tsx");
    const leadership = source("src/pages/performance/director/LeadershipBranchesPerformanceView.tsx");

    expect(manager).toContain("<PersonIdentity");
    expect(people).toContain("<PersonIdentity");
    expect(leadership).toContain("<PersonIdentity");
    expect(header).toContain("<PersonAvatar");
  });

  it("does not give any role view its own page container geometry", () => {
    const css = source("src/pages/performance/performance-dashboard.css");
    const rolePages = [
      "src/pages/performance/director/DirectorOverviewView.tsx",
      "src/pages/performance/director/DirectorPerformanceOverview.tsx",
      "src/pages/performance/EmployeePerformanceOverview.tsx",
    ].map(source);

    for (const page of rolePages) {
      expect(page).not.toMatch(/style=\{\{[^}]*(?:maxWidth|width|padding)/);
    }
    expect(css).not.toMatch(/\.performance-(?:director|manager|employee)-(?:page|container|shell)\s*\{/);
  });

  it("PASS 22.1 packaged-QA follow-ups: shared subnav, secondary signal actions, compact recommendations", () => {
    const subnav = source("src/pages/performance/director/DirectorPerformanceSubnav.tsx");
    const signals = source("src/pages/performance/director/DirectorSignalsView.tsx");
    const recs = source("src/pages/home/dashboard/DashboardRecommendations.tsx");
    const project = source("src/pages/performance/ProjectContextSection.tsx");
    const model = source("src/domain/home/executiveDashboardModel.ts");
    const css = source("src/pages/performance/performance-dashboard.css");

    expect(subnav).toContain("<PageSubnav");
    expect(subnav).not.toContain('<nav className="performance-subnav"');
    expect(signals).toMatch(/variant="secondary"[\s\S]{0,60}onOpen/);
    expect(cssBlock(css, ".performance-director-signals li > div")).toContain("flex: 1");
    expect(recs).toContain("items.length === 1 ? 1");
    expect(recs).toContain("executive-recommendations__list--single");
    expect(project).toContain("docs.length > 0 ?");
    expect(model).toContain("teamsNeedAttentionLabel");
    expect(model).toContain('"team needs"');
  });
});
