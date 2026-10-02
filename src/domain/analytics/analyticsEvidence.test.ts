import { describe, expect, it } from "vitest";
import { buildKpiFromIssues } from "../jira/kpi";
import type { AuditIssue } from "../jira/types";
import { buildAnalyticsEvidence, reconcileEvidenceCount } from "./buildAnalyticsEvidence";
import { collectReportingPeriodCycles } from "./kpiCycleEvidence";

function statusEvent(changedAt: string, fromValue: string, toValue: string, isBackflow = false) {
  return {
    eventType: "Status" as const,
    changedAt,
    changedBy: "User",
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function issueWithCompletion(
  key: string,
  completedAt: string,
  options?: { backflow?: boolean },
): AuditIssue {
  const events = [
    statusEvent("2024-01-02T09:00:00.000Z", "To Do", "In Progress"),
    statusEvent("2024-01-03T09:00:00.000Z", "In Progress", "Review"),
  ];
  if (options?.backflow) {
    events.push(statusEvent("2024-01-03T12:00:00.000Z", "Review", "In Progress", true));
    events.push(statusEvent("2024-01-04T09:00:00.000Z", "In Progress", "Review"));
  }
  events.push(statusEvent(completedAt, "Review", "Done"));

  return {
    issueKey: key,
    issueSummary: `Summary ${key}`,
    issueCreated: "2024-01-01T10:00:00.000Z",
    assigneeName: "Alex Morgan",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "none",
    epicKey: "none",
    epicSummary: "none",
    epicStatus: "none",
    epicContentType: "none",
    epicDesignImprovementType: "none",
    currentStatus: "Done",
    events,
    rangeEvents: events,
  };
}

const params = {
  dateFrom: "2024-01-01",
  dateTo: "2024-01-31",
  targetReviewDays: 3,
  users: ["alex"],
  projects: [],
};

describe("buildAnalyticsEvidence", () => {
  it("matches Completed KPI count", () => {
    const issues = [
      issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z"),
      issueWithCompletion("UX-2", "2024-01-12T09:00:00.000Z"),
      issueWithCompletion("UX-3", "2024-02-04T09:00:00.000Z"),
    ];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const evidence = buildAnalyticsEvidence({
      metric: "completed",
      issues,
      params,
      kpi,
      attributionIndex: {
        "UX-1": { personCanonical: "person-1", personName: "Alex" },
        "UX-2": { personCanonical: "person-1", personName: "Alex" },
      },
      rangeLabel: "Jan 2024",
      targetLabel: "Team target",
    });

    expect(kpi.completedCount).toBe(2);
    expect(evidence.issues.length).toBe(2);
    expect(reconcileEvidenceCount(evidence)).toBe(true);
  });

  it("explains first pass numerator and denominator", () => {
    const issues = [
      issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z"),
      issueWithCompletion("UX-2", "2024-01-12T09:00:00.000Z", { backflow: true }),
    ];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const evidence = buildAnalyticsEvidence({
      metric: "first_pass",
      issues,
      params,
      kpi,
      attributionIndex: {},
      rangeLabel: "Jan 2024",
      targetLabel: "Team target",
    });

    expect(kpi.firstPassAcceptedCount).toBe(1);
    expect(kpi.completedCount).toBe(2);
    expect(evidence.summaryLines.find((line) => line.label === "First pass")?.value).toBe("1");
    expect(evidence.summaryLines.find((line) => line.label === "Rework")?.value).toBe("1");
  });

  it("filters trend bucket completions by completion date", () => {
    const issues = [
      issueWithCompletion("UX-1", "2024-01-18T09:00:00.000Z"),
      issueWithCompletion("UX-2", "2024-01-18T15:00:00.000Z"),
      issueWithCompletion("UX-3", "2024-01-19T09:00:00.000Z"),
    ];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const evidence = buildAnalyticsEvidence({
      metric: "completed",
      issues,
      params,
      kpi,
      attributionIndex: {},
      rangeLabel: "Jan 2024",
      targetLabel: "Team target",
      bucketDate: "2024-01-18",
    });

    expect(evidence.issues.length).toBe(2);
    expect(evidence.totalCountable).toBe(2);
  });

  it("returns aggregate detail level when issues are unavailable", () => {
    const kpi = buildKpiFromIssues([], {}, params);
    const evidence = buildAnalyticsEvidence({
      metric: "completed",
      issues: [],
      params,
      kpi,
      attributionIndex: {},
      rangeLabel: "Jan 2024",
      targetLabel: "Team target",
      issuesAvailable: false,
    });

    expect(evidence.detailLevel).toBe("aggregate");
    expect(evidence.issues.length).toBe(0);
    expect(evidence.aggregateNote).toMatch(/unavailable/i);
  });
});

describe("collectReportingPeriodCycles", () => {
  it("uses the same cycles as KPI aggregation", () => {
    const issues = [issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z")];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const records = collectReportingPeriodCycles(issues, params);
    expect(records.length).toBe(kpi.completedCount);
  });
});
