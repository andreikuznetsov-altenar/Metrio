import { describe, expect, it } from "vitest";
import { buildKpiFromIssues } from "../jira/kpi";
import type { AuditIssue, AuditReportData } from "../jira/types";
import { testKpi } from "../testFixtures";
import { buildAnalyticsEvidence, reconcileEvidenceCount } from "./buildAnalyticsEvidence";
import { analyticsEvidenceInvariant } from "./analyticsEvidenceTrust";
import { reconcilePerformanceAnalytics } from "./kpiReconciliation";

function statusEvent(changedAt: string, fromValue: string, toValue: string) {
  return {
    eventType: "Status" as const,
    changedAt,
    changedBy: "User",
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function issueWithCompletion(key: string, completedAt: string): AuditIssue {
  const events = [
    statusEvent("2024-01-02T09:00:00.000Z", "To Do", "In Progress"),
    statusEvent("2024-01-03T09:00:00.000Z", "In Progress", "Review"),
    statusEvent(completedAt, "Review", "Done"),
  ];
  return {
    issueKey: key,
    issueSummary: `Summary ${key}`,
    issueCreated: "2024-01-01T10:00:00.000Z",
    assigneeName: "Daria Chernova",
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
  users: ["daria"],
  projects: [],
};

const reviewTarget = "team" as const;

const metrics = ["completed", "first_pass", "backflows", "avg_cycle", "efficiency"] as const;

describe("analytics evidence invariants", () => {
  it("never contradicts stored aggregate KPI without task detail (person scope)", () => {
    const issues = [issueWithCompletion("UX-9", "2024-02-10T09:00:00.000Z")];
    const kpiTeam = buildKpiFromIssues(issues, {}, params);
    const evidence = buildAnalyticsEvidence({
      metric: "completed",
      issues,
      params,
      kpi: testKpi({ completedCount: 1 }),
      personKpi: testKpi({ completedCount: 1 }),
      personReportKey: "daria-canonical",
      personDisplayName: "Daria Chernova",
      attributionIndex: {
        "UX-9": { personCanonical: "daria-canonical", personName: "Daria" },
      },
      rangeLabel: "Jan 2024",
      targetLabel: "Team target",
    });

    expect(kpiTeam.completedCount).toBe(0);
    expect(evidence.detailLevel).toBe("aggregate");
    expect(evidence.issues).toHaveLength(0);
    expect(analyticsEvidenceInvariant(evidence)).toBe(true);
    expect(reconcileEvidenceCount(evidence)).toBe(true);
  });

  it("reconciles team scope metrics to production report semantics", () => {
    const issues = [
      issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z"),
      issueWithCompletion("UX-2", "2024-01-12T09:00:00.000Z"),
    ];
    const report: AuditReportData = {
      params,
      grouped: {
        "alex": { userLabel: "Alex", issues },
      },
      teamKpi: buildKpiFromIssues(issues, {}, params),
      perUserKpi: {},
    };

    const reconciliation = reconcilePerformanceAnalytics(report, reviewTarget);
    expect(reconciliation.allMatch).toBe(true);

    for (const metric of metrics) {
      const evidence = buildAnalyticsEvidence({
        metric,
        issues,
        params,
        kpi: report.teamKpi,
        attributionIndex: {},
        rangeLabel: "Jan 2024",
        targetLabel: "Team target",
      });
      expect(analyticsEvidenceInvariant(evidence)).toBe(true);
      expect(reconcileEvidenceCount(evidence)).toBe(true);
    }
  });
});
