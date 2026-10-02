import { describe, expect, it } from "vitest";
import { shouldShowEvidenceListCaption } from "../pages/performance/analyticsDrawerPresentation";
import type { AnalyticsEvidence } from "../domain/analytics/analyticsEvidenceTypes";
import { testKpi } from "../domain/testFixtures";

function taskEvidence(metric: AnalyticsEvidence["metric"]): AnalyticsEvidence {
  return {
    metric,
    title: "Test",
    valueLabel: "1",
    rangeLabel: "Sep",
    targetLabel: "Team",
    description: "Work completed within the selected reporting period.",
    detailLevel: "task",
    summaryLines: [],
    issues: [{ issueKey: "UX-1", title: "One", personId: "1", personName: "A" }],
    totalCountable: 1,
    params: {
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      targetReviewDays: 3,
      users: [],
      projects: [],
    },
    kpi: testKpi(),
  };
}

describe("shouldShowEvidenceListCaption", () => {
  it("shows a single caption for completed and first_pass metrics", () => {
    expect(
      shouldShowEvidenceListCaption(taskEvidence("completed"), 1, false),
    ).toBe(true);
    expect(
      shouldShowEvidenceListCaption(taskEvidence("first_pass"), 1, false),
    ).toBe(true);
  });

  it("hides caption for efficiency supporting list handled separately", () => {
    expect(
      shouldShowEvidenceListCaption(taskEvidence("efficiency"), 1, false),
    ).toBe(false);
  });
});
