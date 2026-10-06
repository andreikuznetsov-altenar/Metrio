import { describe, expect, it } from "vitest";
import { enrichTrendChartSeries } from "./trendChartIssueKeys";
import type { AuditIssue, ReportParams } from "../jira/types";

const params: ReportParams = {
  dateFrom: "2026-09-01",
  dateTo: "2026-10-01",
  reviewTarget: "team",
  users: [],
  projects: [],
};

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
    statusEvent("2026-09-02T09:00:00.000Z", "To Do", "In Progress"),
    statusEvent("2026-09-03T09:00:00.000Z", "In Progress", "Review"),
    statusEvent(completedAt, "Review", "Done"),
  ];
  return {
    issueKey: key,
    issueSummary: `Summary ${key}`,
    issueCreated: "2026-09-01T10:00:00.000Z",
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

describe("enrichTrendChartSeries", () => {
  it("attaches completed issue keys for the bucket date", () => {
    const issues = [
      issueWithCompletion("UX-1", "2026-09-30T15:00:00.000Z"),
      issueWithCompletion("UX-2", "2026-09-30T16:00:00.000Z"),
      issueWithCompletion("UX-3", "2026-09-29T16:00:00.000Z"),
    ];
    const series = enrichTrendChartSeries(
      "Completed",
      issues,
      params,
      [{ date: "2026-09-30", value: 2 }],
    );
    expect(series[0]?.issueKeys).toEqual(["UX-1", "UX-2"]);
  });
});
