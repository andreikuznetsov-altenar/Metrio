// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Card } from "../Card/Card";
import { HelpIcon } from "../HelpIcon/HelpIcon";
import { TooltipProvider } from "../Tooltip/Tooltip";
import { DashboardKpiStrip } from "../../pages/home/dashboard/DashboardKpiStrip";
import type { DashboardKpiCard } from "../../domain/home/buildDashboardKpis";
import "../../styles/tokens.css";
import "./kpi-card.css";
import "../../pages/performance/performance-dashboard.css";

afterEach(() => cleanup());

function wrap(ui: ReactNode) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
}

const dashboardCards: DashboardKpiCard[] = [
  {
    id: "team-health",
    label: "Team health",
    value: "91%",
    tooltip: "Overall efficiency",
    badge: { label: "Healthy", variant: "success" },
  },
];

function PerformanceKpiFixture() {
  return (
    <Card className="performance-metric-card" data-testid="perf-kpi">
      <div className="performance-metric-card__label">
        Efficiency
        <span className="performance-metric-card__help">
          <HelpIcon label="Overall efficiency" />
        </span>
      </div>
      <div className="performance-metric-card__value">91%</div>
      <div
        className="performance-metric-card__context performance-metric-card__context--negative"
        data-testid="perf-kpi-delta"
      >
        +2
      </div>
    </Card>
  );
}

function readTypography(el: Element) {
  const style = getComputedStyle(el);
  return {
    padding: style.padding,
    borderRadius: style.borderRadius,
    borderTopWidth: style.borderTopWidth,
    backgroundColor: style.backgroundColor,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
    textTransform: style.textTransform,
    letterSpacing: style.letterSpacing,
    marginTop: style.marginTop,
  };
}

describe("KPI card shared geometry", () => {
  it("Performance label/value/info match Dashboard KPI geometry", () => {
    const { unmount } = wrap(<DashboardKpiStrip cards={dashboardCards} />);
    const dashCard = screen.getByTestId("dashboard-kpi-strip").querySelector(".executive-kpi-card")!;
    const dashLabel = dashCard.querySelector(".executive-kpi-card__label")!;
    const dashValue = dashCard.querySelector(".executive-kpi-card__value")!;
    const dashHelp = dashCard.querySelector(".help-icon")!;
    const dashGeom = {
      card: readTypography(dashCard),
      label: readTypography(dashLabel),
      value: readTypography(dashValue),
      helpDisplay: getComputedStyle(dashHelp).display,
    };
    unmount();

    wrap(<PerformanceKpiFixture />);
    const perfCard = screen.getByTestId("perf-kpi");
    const perfLabel = perfCard.querySelector(".performance-metric-card__label")!;
    const perfValue = perfCard.querySelector(".performance-metric-card__value")!;
    const perfHelp = perfCard.querySelector(".help-icon")!;

    expect(readTypography(perfCard).padding).toBe(dashGeom.card.padding);
    expect(readTypography(perfCard).borderRadius).toBe(dashGeom.card.borderRadius);
    expect(readTypography(perfCard).borderTopWidth).toBe(dashGeom.card.borderTopWidth);
    expect(readTypography(perfCard).backgroundColor).toBe(dashGeom.card.backgroundColor);

    const perfLabelGeom = readTypography(perfLabel);
    expect(perfLabelGeom.fontSize).toBe(dashGeom.label.fontSize);
    expect(perfLabelGeom.fontWeight).toBe(dashGeom.label.fontWeight);
    expect(perfLabelGeom.color).toBe(dashGeom.label.color);
    expect(perfLabelGeom.textTransform).toBe(dashGeom.label.textTransform);
    expect(perfLabelGeom.letterSpacing).toBe(dashGeom.label.letterSpacing);

    const perfValueGeom = readTypography(perfValue);
    expect(perfValueGeom.fontSize).toBe(dashGeom.value.fontSize);
    expect(perfValueGeom.fontWeight).toBe(dashGeom.value.fontWeight);
    expect(perfValueGeom.color).toBe(dashGeom.value.color);
    expect(perfValueGeom.marginTop).toBe(dashGeom.value.marginTop);

    expect(getComputedStyle(perfHelp).display).toBe(dashGeom.helpDisplay);
  });

  it.each([1280, 1440, 1728] as const)(
    "keeps KPI geometry at viewport width %s",
    (width) => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      wrap(
        <>
          <DashboardKpiStrip cards={dashboardCards} />
          <PerformanceKpiFixture />
        </>,
      );
      const dashValue = screen
        .getByTestId("dashboard-kpi-strip")
        .querySelector(".executive-kpi-card__value")!;
      const perfValue = screen.getByTestId("perf-kpi").querySelector(".performance-metric-card__value")!;
      expect(getComputedStyle(perfValue).fontSize).toBe(getComputedStyle(dashValue).fontSize);
      expect(getComputedStyle(perfValue).fontWeight).toBe(getComputedStyle(dashValue).fontWeight);
    },
  );

  it("keeps Performance delta semantic class (Backflows increase stays negative)", () => {
    wrap(<PerformanceKpiFixture />);
    const delta = screen.getByTestId("perf-kpi-delta");
    expect(delta.className).toContain("performance-metric-card__context--negative");
  });
});
