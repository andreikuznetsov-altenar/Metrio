import { describe, expect, it } from "vitest";
import { buildKpiFromIssues } from "../jira/kpi";
import type { AuditReportData } from "../jira/types";
import {
  formatKpiReconciliationReport,
  reconcileAnalyticsKpiEvidence,
} from "./kpiReconciliation";

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

function issueWithCompletion(key: string, completedAt: string): AuditReportData["grouped"][string]["issues"][number] {
  const events = [
    statusEvent("2024-01-02T09:00:00.000Z", "To Do", "In Progress"),
    statusEvent("2024-01-03T09:00:00.000Z", "In Progress", "Review"),
    statusEvent(completedAt, "Review", "Done"),
  ];
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

describe("reconcileAnalyticsKpiEvidence", () => {
  it("passes when teamKpi and evidence share the same cycle aggregation", () => {
    const issues = [
      issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z"),
      issueWithCompletion("UX-2", "2024-01-12T09:00:00.000Z"),
    ];
    const teamKpi = buildKpiFromIssues(issues, {}, params);
    const reportData: AuditReportData = {
      params,
      grouped: {
        alex: {
          requestedUser: "alex",
          userLabel: "Alex Morgan",
          issues,
          transitionStats: {},
        },
      },
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi,
      perUserKpi: { alex: teamKpi },
    };

    const report = reconcileAnalyticsKpiEvidence(reportData, "team");
    expect(report.allMatch).toBe(true);
    expect(formatKpiReconciliationReport(report)).toContain("OVERALL: PASS");
    expect(report.results.find((row) => row.metric === "Completed")?.matches).toBe(true);
    expect(report.results.find((row) => row.metric === "Backflows")?.semantic).toMatch(
      /cycles with hasBackflow/i,
    );
  });

  it("fails completed reconciliation when dashboard KPI is stale", () => {
    const issues = [issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z")];
    const teamKpi = buildKpiFromIssues(issues, {}, params);
    const reportData: AuditReportData = {
      params,
      grouped: {
        alex: {
          requestedUser: "alex",
          userLabel: "Alex Morgan",
          issues,
          transitionStats: {},
        },
      },
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: { ...teamKpi, completedCount: teamKpi.completedCount + 1 },
      perUserKpi: {},
    };

    const report = reconcileAnalyticsKpiEvidence(reportData, "team");
    expect(report.allMatch).toBe(false);
    expect(report.results.find((row) => row.metric === "Completed")?.matches).toBe(false);
  });

});
