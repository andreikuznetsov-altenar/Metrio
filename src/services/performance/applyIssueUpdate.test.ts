import { describe, expect, it } from "vitest";
import { applyVerifiedIssueUpdate } from "./applyIssueUpdate";
import { buildPerformanceViewModels } from "./performanceViewModel";
import type { PerformanceFetchResult } from "./performanceTypes";
import { createPerformanceDateRange } from "../../domain/performance/performanceDateRange";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";
import type { Person, TeamSnapshot } from "../../domain/people/types";
import type { AuditIssue, AuditReportData, IssueEvent } from "../../domain/jira/types";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi } from "../../domain/testFixtures";
import { filterOwnedIssues } from "../../domain/people/ownedIssues";
import { calculateWorkload } from "../../domain/workload/workloadEngine";
import { emptyDependencyIndex } from "../../domain/dependencies/buildDeliveryDependencyGraph";
import { summarizeTeam } from "../people/personService";

const params: AuditReportData["params"] = {
  dateFrom: "2026-01-01",
  dateTo: "2026-12-31",
  targetReviewDays: 3,
  users: ["p@co.com"],
  projects: ["UX"],
};

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function statusEvent(from: string, to: string, at: string): IssueEvent {
  return {
    eventType: "Status",
    changedAt: at,
    changedBy: "P",
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromBackflow: false,
  };
}

function issue(key: string, status: string, enteredDaysAgo: number): AuditIssue {
  return {
    issueKey: key,
    issueSummary: `${key} summary`,
    issueCreated: daysAgo(200),
    assigneeName: "Pat",
    projectKey: "UX",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    events: [statusEvent("In Progress", status, daysAgo(enteredDaysAgo))],
    rangeEvents: [],
    currentStatus: status,
    currentAssigneeCanonical: "jira-p",
  };
}

function build(): PerformanceFetchResult {
  const issues = [issue("UX-123", "In Review", 45), issue("UX-200", "In Review", 45)];
  const person: Person = {
    id: "p",
    bamboo: {
      id: "p",
      displayName: "Pat Person",
      firstName: "Pat",
      lastName: "Person",
      workEmail: "p@co.com",
      jobTitle: "Designer",
      status: "Active",
    },
    jira: { accountId: "jira-p", displayName: "Pat Person", email: "p@co.com", canonicalKey: "jira-p" },
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: calculateWorkload(issues, params),
    personalWorkload: calculateWorkload(issues, params),
    performance: testKpi({}),
    issues,
    ownedIssues: filterOwnedIssues(issues, "jira-p"),
  };
  const teamSnapshot: TeamSnapshot = {
    mode: "team",
    persons: [person],
    summary: summarizeTeam([person], params),
  };
  const reportData: AuditReportData = {
    params,
    grouped: { "jira-p": { requestedUser: "jira-p", userLabel: "Pat", issues, transitionStats: {} } },
    totalTransitions: 0,
    teamSummaryColumns: [],
    teamKpi: testKpi({}),
    perUserKpi: {},
  };
  return {
    teamSnapshot,
    historyTeamSnapshot: teamSnapshot,
    reportData,
    historyReportData: reportData,
    kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
    reportParams: params,
    reportRanges: resolvePerformanceReportRanges(createPerformanceDateRange("30d"), "team", "team", 3),
    identityResolution: [],
    timeOffEntries: [],
    partialWarnings: [],
    lastUpdatedAt: new Date().toISOString(),
    historicalBootstrapRan: false,
    dependencyIndex: emptyDependencyIndex(),
  };
}

describe("applyVerifiedIssueUpdate (verified Jira transition → canonical recompute)", () => {
  it("removes the completed issue from Delivery Risk, Attention and counts without a global refresh", () => {
    const before = build();
    const vmBefore = buildPerformanceViewModels(before, "p");
    const riskKeysBefore = vmBefore.teamSecondary.deliveryRisk.map((r) => r.issueKey);
    expect(riskKeysBefore).toContain("UX-123");
    const attentionBefore = vmBefore.teamOverview.attention.reduce((n, a) => n + a.issueCount, 0);
    expect(attentionBefore).toBe(2);

    const after = applyVerifiedIssueUpdate(before, {
      issueKey: "UX-123",
      currentStatus: "Done",
      statusEvents: [statusEvent("In Review", "Done", new Date().toISOString())],
    });
    const vmAfter = buildPerformanceViewModels(after, "p");

    expect(vmAfter.teamSecondary.deliveryRisk.map((r) => r.issueKey)).not.toContain("UX-123");
    expect(vmAfter.teamSecondary.deliveryRisk.map((r) => r.issueKey)).toContain("UX-200");
    expect(vmAfter.teamOverview.attention.reduce((n, a) => n + a.issueCount, 0)).toBe(1);
    expect(after.teamSnapshot.summary).toEqual(summarizeTeam(after.teamSnapshot.persons, params));
    expect(after.teamSnapshot.persons[0]!.ownedIssues.find((i) => i.issueKey === "UX-123")?.currentStatus).toBe("Done");
    expect(vmAfter.teamSecondary.deliveryRisk.length).toBe(vmBefore.teamSecondary.deliveryRisk.length - 1);
    // input is not mutated (nothing is "optimistically" changed in place)
    expect(before.reportData.grouped["jira-p"]!.issues[0]!.currentStatus).toBe("In Review");
  });

  /** Same data, but the stale issue is ONLY in `ownedIssues` (currently assigned, never touched by the person). */
  function buildOwnedOnly(extra: AuditIssue[] = []): PerformanceFetchResult {
    const base = build();
    const owned = base.teamSnapshot.persons[0]!.ownedIssues;
    const historical = [issue("UX-HIST", "Done", 300)];
    const person: Person = { ...base.teamSnapshot.persons[0]!, issues: historical, ownedIssues: [...owned, ...extra] };
    const teamSnapshot: TeamSnapshot = { ...base.teamSnapshot, persons: [person], summary: summarizeTeam([person], params) };
    return { ...base, teamSnapshot, historyTeamSnapshot: teamSnapshot };
  }

  it("REGRESSION: an issue that exists ONLY in ownedIssues (the array Delivery Risk reads) is patched too", () => {
    const before = buildOwnedOnly();
    expect(before.teamSnapshot.persons[0]!.issues.some((i) => i.issueKey === "UX-123")).toBe(false);
    const vmBefore = buildPerformanceViewModels(before, "p");
    expect(vmBefore.teamSecondary.deliveryRisk.map((r) => r.issueKey)).toContain("UX-123");

    const after = applyVerifiedIssueUpdate(before, {
      issueKey: "UX-123",
      currentStatus: "Done",
      statusEvents: [statusEvent("In Review", "Done", new Date().toISOString())],
    });
    const vmAfter = buildPerformanceViewModels(after, "p");
    expect(vmAfter.teamSecondary.deliveryRisk.map((r) => r.issueKey)).not.toContain("UX-123");
    expect(vmAfter.teamSecondary.deliveryRisk.length).toBe(vmBefore.teamSecondary.deliveryRisk.length - 1);
    expect(after.teamSnapshot.persons[0]!.ownedIssues.find((i) => i.issueKey === "UX-123")?.currentStatus).toBe("Done");
  });

  for (const finalStatus of ["Done", "Closed", "Approved"]) {
    it(`any canonical terminal-success final status leaves current risk, not just the raw name "Done" (${finalStatus})`, () => {
      const before = buildOwnedOnly();
      const after = applyVerifiedIssueUpdate(before, {
        issueKey: "UX-123",
        currentStatus: finalStatus,
        statusEvents: [statusEvent("In Review", finalStatus, new Date().toISOString())],
      });
      const risk = buildPerformanceViewModels(after, "p").teamSecondary.deliveryRisk.map((r) => r.issueKey);
      expect(risk).not.toContain("UX-123");
      expect(risk).toContain("UX-200");
    });
  }

  it("Recommended actions, workload and team summary follow the SAME updated source (7 → 6 → gone)", async () => {
    const { buildRecommendedActions } = await import("../../domain/recommendedActions/buildRecommendedActions");
    const seven = Array.from({ length: 7 }, (_, i) => issue(`UX-${300 + i}`, "In Review", 45));
    let data = buildOwnedOnly(seven);
    const stale = (d: PerformanceFetchResult) =>
      buildRecommendedActions({
        scope: "team_lead",
        now: new Date(),
        teamIssues: d.teamSnapshot.persons.flatMap((p) => p.ownedIssues),
        teamWorkload: [],
        teamActions: [],
        deliveryRiskRows: buildPerformanceViewModels(d, "p").teamSecondary.deliveryRisk.map((r) => ({
          issueKey: r.issueKey,
          ownerId: r.personId,
          ownerName: r.personName,
        })),
      }).find((a) => a.id === "stale-review");
    expect(stale(data)?.affectedCount).toBe(9); // UX-123, UX-200 + 7
    const activeBefore = data.teamSnapshot.persons[0]!.workload?.activeCount ?? 0;
    data = applyVerifiedIssueUpdate(data, {
      issueKey: "UX-300",
      currentStatus: "Closed",
      statusEvents: [statusEvent("In Review", "Closed", new Date().toISOString())],
    });
    expect(stale(data)?.affectedCount).toBe(8);
    expect(data.teamSnapshot.persons[0]!.workload?.activeCount ?? 0).toBeLessThanOrEqual(activeBefore);
    for (const key of ["UX-301", "UX-302", "UX-303", "UX-304", "UX-305", "UX-123", "UX-200"]) {
      data = applyVerifiedIssueUpdate(data, {
        issueKey: key,
        currentStatus: "Approved",
        statusEvents: [statusEvent("In Review", "Approved", new Date().toISOString())],
      });
    }
    expect(stale(data)?.affectedCount).toBe(1); // UX-306 left
    data = applyVerifiedIssueUpdate(data, {
      issueKey: "UX-306",
      currentStatus: "Done",
      statusEvents: [statusEvent("In Review", "Done", new Date().toISOString())],
    });
    expect(stale(data)).toBeUndefined();
    expect(buildPerformanceViewModels(data, "p").teamSecondary.deliveryRisk).toHaveLength(0);
  });
});
