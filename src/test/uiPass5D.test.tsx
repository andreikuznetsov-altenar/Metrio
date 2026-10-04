import { describe, expect, it } from "vitest";
import { formatPerformanceDateDisplay, formatPerformanceDateRangeDisplay } from "../domain/performance/performanceDateRange";
import { humanizeMachineEnum } from "../platform/humanizeDisplay";
import { badgeVariantForAttentionLabel } from "../platform/attentionSemanticBadge";
import { formatDuration } from "../domain/jira/dates";
import { analyticsEvidenceInvariant } from "../domain/analytics/analyticsEvidenceTrust";
import { buildAnalyticsEvidence } from "../domain/analytics/buildAnalyticsEvidence";
import { testKpi } from "../domain/testFixtures";

describe("UI Repair Pass 5D", () => {
  it("maps attention labels to semantic badge variants", () => {
    expect(badgeVariantForAttentionLabel("Overloaded")).toBe("warning");
    expect(badgeVariantForAttentionLabel("Available")).toBe("success");
    expect(badgeVariantForAttentionLabel("Not configured")).toBe("neutral");
  });

  it("humanizes machine enums for display", () => {
    expect(humanizeMachineEnum("not_configured")).toBe("Not configured");
    expect(humanizeMachineEnum("first_pass")).toBe("First pass");
    expect(humanizeMachineEnum("permission_limited")).toBe("Limited permissions");
  });

  it("formats performance dates for executives", () => {
    expect(formatPerformanceDateDisplay("2026-09-28")).toBe("28 Sep 2026");
    expect(formatPerformanceDateRangeDisplay("2026-09-28", "2026-10-04")).toBe(
      "28 Sep – 4 Oct 2026",
    );
  });

  it("formats durations without decimal days", () => {
    expect(formatDuration(2.5 * 3600000)).toBe("2h 30m");
    expect(formatDuration(29 * 3600000 + 24 * 60000)).toBe("1d 5h");
  });

  it("blocks aggregate KPI with empty task evidence contradiction", () => {
    const evidence = buildAnalyticsEvidence({
      metric: "completed",
      issues: [],
      params: {
        dateFrom: "2024-01-01",
        dateTo: "2024-01-31",
        targetReviewDays: 3,
        users: [],
        projects: [],
      },
      kpi: testKpi({ completedCount: 2 }),
      attributionIndex: {},
      rangeLabel: "Jan 2024",
      targetLabel: "Team",
      issuesAvailable: false,
    });
    expect(evidence.detailLevel).toBe("aggregate");
    expect(analyticsEvidenceInvariant(evidence)).toBe(true);
  });
});
