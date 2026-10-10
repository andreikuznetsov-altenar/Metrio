import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsDrilldownDrawer } from "./AnalyticsDrilldownDrawer";
import type { AnalyticsEvidence } from "../../domain/analytics/analyticsEvidenceTypes";

const evidence: AnalyticsEvidence = {
  metric: "backflows",
  title: "Backflows",
  valueLabel: "0",
  description: "Completed work that returned to an earlier workflow stage.",
  personDisplayName: "Daria Chernova",
  rangeLabel: "4 Sep – 4 Oct 2026",
  bucketDate: null,
  detailLevel: "task",
  kpi: { backflowCount: 0, completedCount: 4, firstPassRate: 0, avgCycleMs: 0 },
  issues: [],
  summaryLines: [],
  aggregateNote: "",
};

describe("AnalyticsDrilldownDrawer", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders metric intro in body and not in drawer header slot", () => {
    render(
      <AnalyticsDrilldownDrawer
        open
        evidence={evidence}
        onClose={vi.fn()}
        onOpenPerson={vi.fn()}
      />,
    );
    expect(screen.getByTestId("analytics-drawer-intro")).toBeTruthy();
    expect(screen.getByText("Backflows")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.queryByText("Daria Chernova · Backflows")).toBeNull();
    expect(screen.getByText("Daria Chernova")).toBeTruthy();
    expect(screen.getByText(/4 Sep – 4 Oct 2026/)).toBeTruthy();
  });

  it("keeps drawer header toolbar to close control only", () => {
    render(
      <AnalyticsDrilldownDrawer
        open
        evidence={evidence}
        onClose={vi.fn()}
        onOpenPerson={vi.fn()}
      />,
    );
    const header = document.querySelector(".drawer--analytics .drawer__header");
    expect(header).toBeTruthy();
    expect(header!.querySelector("h1, h2")).toBeNull();
    const toolbar = header!.querySelector(".drawer__header-toolbar");
    expect(toolbar).toBeTruthy();
    expect(
      toolbar!.querySelector('button[aria-label*="Close"]'),
    ).toBeTruthy();
    expect(header!.textContent).not.toContain("Backflows");
    expect(header!.textContent).not.toContain("0");
  });

  it("shows healthy zero backflows state in body", () => {
    render(
      <AnalyticsDrilldownDrawer
        open
        evidence={evidence}
        onClose={vi.fn()}
        onOpenPerson={vi.fn()}
      />,
    );
    expect(screen.getAllByText("No backflows in this period").length).toBeGreaterThan(0);
  });
});
