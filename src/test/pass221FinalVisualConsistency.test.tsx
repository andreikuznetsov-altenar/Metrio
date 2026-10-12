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
    expect(cssBlock(css, ".dashboard-your-manager")).not.toContain("padding:");
  });

  it("uses canonical scope strip for employee performance context", () => {
    const component = source("src/pages/performance/EmployeePerformanceOverview.tsx");

    expect(component).toContain("performance-section performance-scope-strip");
    expect(component).toContain("performance-scope-strip__eyebrow");
    expect(component).toContain("performance-scope-strip__title");
    expect(component).not.toContain("performance-employee-context");
  });

  it("renders Resources Open actions as secondary buttons", () => {
    const performance = source("src/pages/performance/EmployeePerformanceOverview.tsx");
    const dashboard = source("src/pages/home/dashboard/DashboardEmployeeWorkSummary.tsx");

    expect(performance).not.toMatch(/variant="ghost"[\s\S]{0,160}Open/);
    expect(dashboard).not.toMatch(/variant="ghost"[\s\S]{0,160}Open/);
    expect(performance).toMatch(/variant="secondary"[\s\S]{0,160}Open/);
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
    expect(currentDot).toContain("box-shadow: 0 0 0 3px");
  });

  it("keeps director scope horizontal and compacts adjacent overview modules", () => {
    const component = source("src/pages/performance/director/DirectorOverviewView.tsx");
    const css = source("src/pages/performance/performance-dashboard.css");
    const scope = cssBlock(css, ".performance-scope-strip");

    expect(component).toContain("performance-scope-strip");
    expect(component).toContain("View all teams");
    expect(scope).toContain("display: flex");
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
});
