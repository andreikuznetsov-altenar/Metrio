import { describe, expect, it } from "vitest";
import { buildKpiFromIssues } from "../jira/kpi";
import type { AuditIssue } from "../jira/types";
import { testKpi } from "../testFixtures";
import { buildAnalyticsEvidence, reconcileEvidenceCount } from "./buildAnalyticsEvidence";
import { analyticsEvidenceInvariant } from "./analyticsEvidenceTrust";

function statusEvent(
  changedAt: string,
  fromValue: string,
  toValue: string,
  isBackflow = false,
) {
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
    events.push(statusEvent("2024-01-03T14:00:00.000Z", "Review", "In Progress", true));
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

const baseInput = {
  issues: [] as AuditIssue[],
  params,
  kpi: testKpi(),
  attributionIndex: {} as Record<string, { personCanonical: string; personName: string }>,
  rangeLabel: "1 Jan – 31 Jan 2024",
  targetLabel: "Team",
};

function assertInvariant(metric: Parameters<typeof buildAnalyticsEvidence>[0]["metric"], overrides: Partial<typeof baseInput> & { metric?: never }) {
  const evidence = buildAnalyticsEvidence({ ...baseInput, metric, ...overrides });
  expect(reconcileEvidenceCount(evidence)).toBe(true);
  expect(analyticsEvidenceInvariant(evidence)).toBe(true);
  return evidence;
}

describe("analytics evidence matrix — team", () => {
  it("completed: zero, one, many", () => {
    assertInvariant("completed", { issues: [], kpi: testKpi({ completedCount: 0 }) });
    const one = [issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z")];
    const kpiOne = buildKpiFromIssues(one, {}, params);
    const e1 = assertInvariant("completed", { issues: one, kpi: kpiOne });
    expect(e1.issues).toHaveLength(1);
    const two = [
      issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z"),
      issueWithCompletion("UX-2", "2024-01-12T09:00:00.000Z"),
    ];
    const kpiTwo = buildKpiFromIssues(two, {}, params);
    const e2 = assertInvariant("completed", { issues: two, kpi: kpiTwo });
    expect(e2.issues).toHaveLength(2);
  });

  it("first pass: 5 completed, 5 first pass, 0 rework", () => {
    const issues = Array.from({ length: 5 }, (_, i) =>
      issueWithCompletion(`UX-${i + 1}`, `2024-01-${10 + i}T09:00:00.000Z`),
    );
    const kpi = buildKpiFromIssues(issues, {}, params);
    const evidence = assertInvariant("first_pass", { issues, kpi });
    expect(evidence.issues).toHaveLength(5);
    expect(evidence.summaryLines.find((l) => l.label === "First pass")?.value).toBe("5");
    expect(evidence.summaryLines.find((l) => l.label === "Rework")?.value).toBe("0");
  });

  it("backflows: cycle semantics vs trend event semantics", () => {
    const issues = [issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z", { backflow: true })];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const cycles = assertInvariant("backflows", { issues, kpi });
    expect(cycles.totalCountable).toBe(kpi.backflowCount);
    const events = assertInvariant("backflows", {
      issues,
      kpi,
      bucketDate: "2024-01-03",
      trendBackflowEvents: true,
    });
    expect(events.issues.length).toBeGreaterThan(0);
  });

  it("avg cycle uses same population as evidence rows", () => {
    const issues = [issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z")];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const evidence = assertInvariant("avg_cycle", { issues, kpi });
    expect(evidence.issues).toHaveLength(kpi.completedCount);
  });

  it("efficiency uses scoped kpi components", () => {
    const issues = [issueWithCompletion("UX-1", "2024-01-10T09:00:00.000Z")];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const evidence = assertInvariant("efficiency", { issues, kpi });
    expect(evidence.efficiencyComponents?.length).toBe(4);
    expect(evidence.valueLabel).toMatch(/%$/);
  });

  it("aggregate-only when stored kpi > 0 without issue detail", () => {
    const evidence = assertInvariant("completed", {
      issues: [],
      kpi: testKpi({ completedCount: 5 }),
      issuesAvailable: false,
    });
    expect(evidence.detailLevel).toBe("aggregate");
    expect(evidence.aggregateNote).toMatch(/aggregate snapshot/i);
  });
});

describe("analytics evidence matrix — person", () => {
  const personKey = "daria-canonical";

  it("historical attribution: completion outside window → aggregate or zero KPI", () => {
    const issues = [issueWithCompletion("UX-9", "2024-02-10T09:00:00.000Z")];
    const evidence = buildAnalyticsEvidence({
      metric: "completed",
      issues,
      params,
      kpi: buildKpiFromIssues(issues, {}, params),
      personReportKey: personKey,
      personDisplayName: "Daria Chernova",
      attributionIndex: {
        "UX-9": { personCanonical: personKey, personName: "Daria" },
      },
      rangeLabel: "Jan 2024",
      targetLabel: "Person",
    });
    expect(evidence.kpi.completedCount).toBe(0);
    expect(evidence.issues).toHaveLength(0);
    expect(evidence.valueLabel).toBe("0");
    expect(reconcileEvidenceCount(evidence)).toBe(true);
  });

  it("person scoped completed matches cycle rows", () => {
    const issues = [issueWithCompletion("UX-1", "2024-01-15T09:00:00.000Z")];
    const kpi = buildKpiFromIssues(issues, {}, params);
    const evidence = buildAnalyticsEvidence({
      metric: "completed",
      issues,
      params,
      kpi,
      personReportKey: personKey,
      attributionIndex: {
        "UX-1": { personCanonical: personKey, personName: "Daria" },
      },
      rangeLabel: "Jan 2024",
      targetLabel: "Person",
    });
    expect(evidence.issues).toHaveLength(1);
    expect(reconcileEvidenceCount(evidence)).toBe(true);
  });
});
