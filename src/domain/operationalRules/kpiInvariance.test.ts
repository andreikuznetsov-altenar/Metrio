import { describe, expect, it } from "vitest";
import { buildKpiFromIssues } from "../jira/kpi";
import type { AuditIssue } from "../jira/types";
import { classifyIssueAttention } from "../radar/taskSignals";
import { DEFAULT_OPERATIONAL_RULES } from "./operationalRulesDefaults";
import { normalizeOperationalRules } from "./normalizeOperationalRules";

function issueInReview(daysAgo: number): AuditIssue {
  const changedAt = new Date();
  changedAt.setDate(changedAt.getDate() - daysAgo);
  return {
    issueKey: "UX-1",
    issueSummary: "Task",
    issueCreated: changedAt.toISOString(),
    assigneeName: "Alex",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "none",
    epicKey: "none",
    epicSummary: "none",
    epicStatus: "none",
    epicContentType: "none",
    epicDesignImprovementType: "none",
    currentStatus: "In Review",
    events: [
      {
        eventType: "Status",
        changedAt: changedAt.toISOString(),
        changedBy: "User",
        fromValue: "In Progress",
        toValue: "In Review",
        timeSincePreviousStatusMs: null,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
    rangeEvents: [],
  };
}

const params = {
  dateFrom: "2024-01-01",
  dateTo: "2026-12-31",
  targetReviewDays: 3,
  users: [],
  projects: [],
};

describe("KPI invariance vs operational rules", () => {
  it("changing review attention threshold does not change KPI output", () => {
    const issues = [issueInReview(10)];
    const kpiBefore = buildKpiFromIssues(issues, {}, params);
    const strictRules = normalizeOperationalRules({
      taskAttention: { reviewAttentionDays: 20, noActivityDays: 30 },
    });
    const lenientRules = normalizeOperationalRules({
      taskAttention: { reviewAttentionDays: 3, noActivityDays: 3 },
    });
    const kpiAfter = buildKpiFromIssues(issues, {}, params);
    expect(kpiAfter.completedCount).toBe(kpiBefore.completedCount);
    expect(kpiAfter.backflowCount).toBe(kpiBefore.backflowCount);
    expect(kpiAfter.efficiencyIndex).toBe(kpiBefore.efficiencyIndex);
    const strictAttention = classifyIssueAttention(
      issues[0]!,
      params,
      new Date(),
      strictRules,
    );
    const lenientAttention = classifyIssueAttention(
      issues[0]!,
      params,
      new Date(),
      lenientRules,
    );
    expect(strictAttention?.reason).not.toEqual(lenientAttention?.reason);
    expect(
      classifyIssueAttention(
        issues[0]!,
        params,
        new Date(),
        DEFAULT_OPERATIONAL_RULES,
      ),
    ).not.toBeNull();
  });
});
