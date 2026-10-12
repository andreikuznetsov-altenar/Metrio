import { describe, expect, it } from "vitest";
import { buildEnhancedJiraAuditReport, buildTeamIdentityIndex } from "../../domain/jira/report";
import type { AuditReportData, ReportParams, TeamUser } from "../../domain/jira/types";
import { DEFAULT_WORKLOAD_THRESHOLDS } from "../../domain/workload/workloadEngine";
import { buildTeamSnapshot } from "../people/personService";
import type { OrgResolutionResult } from "../bamboo/orgResolver";
import { mergeIssuesByKey } from "./performanceDataService";
import { buildPerformanceViewModels } from "./performanceViewModel";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";
import { createPerformanceDateRange } from "../../domain/performance/performanceDateRange";
import type { PerformanceFetchResult } from "./performanceTypes";

const params: ReportParams = {
  dateFrom: "2026-09-01",
  dateTo: "2026-10-12",
  targetReviewDays: 3,
  users: ["valeriia@metrio.example"],
  projects: ["UX"],
};

const teamUsers: TeamUser[] = [
  {
    canonical: "valeriia@metrio.example",
    inputUser: "valeriia@metrio.example",
    email: "valeriia@metrio.example",
    displayName: "Valeriia Pavlova",
    accountId: "valeriia-account",
  },
];

const org: OrgResolutionResult = {
  ok: true,
  mode: "personal",
  employee: {
    id: "valeriia",
    displayName: "Valeriia Pavlova",
    firstName: "Valeriia",
    lastName: "Pavlova",
    workEmail: "valeriia@metrio.example",
    jobTitle: "Designer",
    status: "Active",
  },
  directReports: [],
  fullTeam: [],
  warnings: [],
};

function rawIssue(
  key: string,
  projectKey: string,
  projectName: string,
  status: string,
  issueTypeName = "Task",
) {
  return {
    key,
    fields: {
      summary: `${key} current work`,
      created: "2026-08-01T09:00:00.000Z",
      assignee: {
        accountId: "valeriia-account",
        emailAddress: "valeriia@metrio.example",
        displayName: "Valeriia Pavlova",
      },
      status: { name: status },
      issuetype: { id: issueTypeName.toLowerCase(), name: issueTypeName, subtask: false },
      project: { key: projectKey, name: projectName },
      parent: null,
      reporter: null,
      issuelinks: [],
      duedate: null,
    },
  };
}

async function buildReport(issues: unknown[]): Promise<AuditReportData> {
  return buildEnhancedJiraAuditReport({
    issues,
    params,
    teamUsers,
    teamIdentityIndex: buildTeamIdentityIndex(teamUsers, params.users),
    changelogByIssue: new Map(issues.map((issue) => [(issue as { key: string }).key, []])),
    fetchIssueByKey: async () => {
      throw new Error("unexpected epic fetch");
    },
  });
}

async function buildFetchResult(issues: unknown[]): Promise<PerformanceFetchResult> {
  const reportData = await buildReport(issues);
  const teamSnapshot = buildTeamSnapshot(
    org,
    reportData,
    [],
    DEFAULT_WORKLOAD_THRESHOLDS,
    teamUsers,
  );

  return {
    teamSnapshot,
    historyTeamSnapshot: teamSnapshot,
    reportData,
    historyReportData: reportData,
    kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
    reportParams: params,
    reportRanges: resolvePerformanceReportRanges(
      createPerformanceDateRange("30d"),
      "personal",
      "self",
      3,
    ),
    identityResolution: [],
    timeOffEntries: [],
    partialWarnings: [],
    lastUpdatedAt: "2026-10-12T12:00:00.000Z",
    historicalBootstrapRan: false,
  };
}

describe("PASS 21 cross-board current work discovery", () => {
  it("includes active issues from project A and project B in one canonical current set", async () => {
    const merged = mergeIssuesByKey(
      [rawIssue("UX-1", "UX", "UX", "In Progress")],
      [rawIssue("AGTC-2", "AGTC", "AGG Thumbnails Casino", "In Progress")],
    );

    const report = await buildReport(merged);
    const owned = report.grouped["valeriia@metrio.example"].issues;

    expect(owned.map((issue) => issue.issueKey)).toEqual(["AGTC-2", "UX-1"]);
    expect(owned.map((issue) => issue.projectName).sort()).toEqual([
      "AGG Thumbnails Casino",
      "UX",
    ]);
  });

  it("uses the existing AGTC workflow mapping so AGTC In Progress is canonical active", async () => {
    const result = await buildFetchResult([
      rawIssue("AGTC-3", "AGTC", "AGG Thumbnails Casino", "In Progress"),
    ]);
    const person = result.teamSnapshot.persons[0];

    expect(person.ownedIssues[0]?.projectKey).toBe("AGTC");
    expect(person.personalWorkload?.activeWorkCount).toBe(1);
    expect(person.personalWorkload?.capacityContributorIssueCount).toBe(1);
  });

  it("deduplicates the same issue found through historical and current-work paths", async () => {
    const merged = mergeIssuesByKey(
      [rawIssue("AGTC-4", "AGTC", "AGG Thumbnails Casino", "In Progress")],
      [rawIssue("AGTC-4", "AGTC", "AGG Thumbnails Casino", "In Progress")],
    );

    const report = await buildReport(merged);
    expect(report.grouped["valeriia@metrio.example"].issues).toHaveLength(1);
  });

  it("keeps Review and Hold from a second project visible as owned current work but not capacity contributors", async () => {
    const result = await buildFetchResult([
      rawIssue("AGTC-5", "AGTC", "AGG Thumbnails Casino", "In Review"),
      rawIssue("AGTC-6", "AGTC", "AGG Thumbnails Casino", "On Hold"),
    ]);
    const person = result.teamSnapshot.persons[0];

    expect(person.ownedIssues.map((issue) => issue.issueKey)).toEqual(["AGTC-5", "AGTC-6"]);
    expect(person.personalWorkload?.reviewCount).toBe(1);
    expect(person.personalWorkload?.holdCount).toBe(1);
    expect(person.personalWorkload?.capacityContributorIssueCount).toBe(0);
    expect(person.personalWorkload?.level).toBe("low");
  });

  it("feeds Dashboard, workload balance, and person drawer from the same canonical current issue set", async () => {
    const result = await buildFetchResult([
      rawIssue("UX-7", "UX", "UX", "In Progress"),
      rawIssue("AGTC-8", "AGTC", "AGG Thumbnails Casino", "In Progress"),
    ]);
    const vm = buildPerformanceViewModels(result, "valeriia");

    expect(result.teamSnapshot.persons[0].ownedIssues.map((issue) => issue.issueKey)).toEqual([
      "AGTC-8",
      "UX-7",
    ]);
    expect(vm.employee?.myWeek.inProgress.map((row) => row.key)).toEqual([
      "AGTC-8",
      "UX-7",
    ]);
    expect(vm.teamOverview.workload[0]?.activeWork).toBe(2);
    expect(vm.getPersonDetail("valeriia")?.activeWork.map((row) => row.key)).toEqual([
      "AGTC-8",
      "UX-7",
    ]);
  });
});
