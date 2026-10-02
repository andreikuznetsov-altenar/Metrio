import { describe, expect, it } from "vitest";
import { isBackflowsZeroState } from "../pages/performance/analyticsDrawerPresentation";
import type { AnalyticsEvidence } from "../domain/analytics/analyticsEvidenceTypes";
import { testKpi } from "../domain/testFixtures";

describe("isBackflowsZeroState", () => {
  it("detects backflows zero drawer state", () => {
    const evidence: AnalyticsEvidence = {
      metric: "backflows",
      title: "Backflows",
      valueLabel: "0",
      rangeLabel: "Sep",
      targetLabel: "Team target",
      description: "Backflows",
      detailLevel: "task",
      summaryLines: [],
      issues: [],
      totalCountable: 0,
      params: {
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        targetReviewDays: 3,
        users: [],
        projects: [],
      },
      kpi: testKpi({ backflowCount: 0 }),
    };

    expect(isBackflowsZeroState(evidence)).toBe(true);
  });
});
