import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  });
});
