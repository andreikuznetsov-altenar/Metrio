/**
 * Controlled performance payload for Playwright visual tests only.
 * Loaded dynamically when VITE_VISUAL_FIXTURE=1 (never in production builds).
 */
import type { AuditIssue, AuditReportData } from "../domain/jira/types";
import type { Person, TeamSnapshot } from "../domain/people/types";
import type { TimeOffEntry } from "../domain/people/availability";
import type {
  DateRangeKey,
  PerformanceReviewTarget,
} from "../domain/performance";
import type { PerformanceAudience } from "../domain/performance/reportParams";
import { createPerformanceDateRange } from "../domain/performance/performanceDateRange";
import { resolvePerformanceReportRanges } from "../domain/performance/reportParams";
import {
  EMPTY_KPI_SNAPSHOT_FILE,
  recordDailySnapshots,
} from "../domain/snapshots/snapshotEngine";
import type { KpiSnapshotFile } from "../domain/snapshots/types";
import { testKpi, testWorkload } from "../domain/testFixtures";
import { filterOwnedIssues } from "../domain/people/ownedIssues";
import { getPerson } from "./people";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import { emptyDependencyIndex } from "../domain/dependencies/buildDeliveryDependencyGraph";
import { readDashboardVisualQueryFlag } from "./dashboardVisualOverrides";

const VISUAL_TEAM_IDS = [
  "person-sam",
  "person-alex",
  "person-01",
  "person-02",
  "person-03",
  "person-04",
  "person-05",
] as const;

const params: AuditReportData["params"] = {
  dateFrom: "2026-01-15",
  dateTo: new Date().toISOString().slice(0, 10),
  targetReviewDays: 3,
  users: VISUAL_TEAM_IDS.map((id) => `${id}@visual.metrio`),
  projects: ["UX"],
};

function activeIssue(
  key: string,
  summary: string,
  status = "In Progress",
  ownerCanonical?: string,
): AuditIssue {
  return {
    issueKey: key,
    issueSummary: summary,
    issueCreated: "2026-01-10T00:00:00.000Z",
    assigneeName: "Visual",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    events: [],
    rangeEvents: [],
    currentStatus: status,
    ...(ownerCanonical ? { currentAssigneeCanonical: ownerCanonical } : {}),
  };
}

function visualPerson(
  fixtureId: (typeof VISUAL_TEAM_IDS)[number],
  options: {
    jobTitle?: string;
    department?: string;
    hireDate?: string;
    workload?: ReturnType<typeof testWorkload>;
    performance?: ReturnType<typeof testKpi>;
    issues?: AuditIssue[];
    availability?: Person["availability"];
  } = {},
): Person {
  const fixture = getPerson(fixtureId);
  const canonical = `jira-${fixtureId}`;
  const issues = (options.issues ?? []).map((issue) => ({
    ...issue,
    currentAssigneeCanonical:
      issue.currentAssigneeCanonical ?? canonical,
  }));
  return {
    id: fixtureId,
    bamboo: {
      id: fixtureId,
      displayName: fixture.name,
      firstName: fixture.name.split(" ")[0] ?? fixture.name,
      lastName: fixture.name.split(" ").slice(1).join(" "),
      workEmail: `${fixtureId}@visual.metrio`,
      jobTitle: options.jobTitle ?? "Product Designer",
      department: options.department,
      hireDate: options.hireDate,
      status: "Active",
    },
    jira: {
      accountId: `jira-${fixtureId}`,
      displayName: fixture.name,
      email: `${fixtureId}@visual.metrio`,
      canonicalKey: `jira-${fixtureId}`,
    },
    identity: { matchedBy: "email", warnings: [] },
    availability:
      options.availability ?? {
        state: "available",
        label: "Available",
        isHoliday: false,
      },
    workload:
      options.workload ??
      testWorkload({ level: "normal", activeCount: 4, atRiskCount: 0 }),
    performance:
      options.performance ??
      testKpi({
        efficiencyIndex: 82,
        completedCount: 6,
        firstPassAcceptedCount: 5,
        backflowCount: 1,
        avgProgressToReviewMs: 2.5 * 24 * 60 * 60 * 1000,
      }),
    issues,
    ownedIssues: filterOwnedIssues(issues, canonical),
  };
}

function buildTeamPersons(): Person[] {
  return [
    visualPerson("person-sam", {
      jobTitle: "Design Lead",
      department: "Design",
      performance: testKpi({
        efficiencyIndex: 88,
        completedCount: 4,
        firstPassAcceptedCount: 4,
        backflowCount: 0,
      }),
    }),
    visualPerson("person-alex", {
      jobTitle: "Product Designer",
      department: "Design",
      hireDate: "2026-09-14",
      issues: [
        activeIssue(
          "UX-401",
          "Component audit",
          "In Progress",
          "jira-person-alex",
        ),
      ],
    }),
    visualPerson("person-01", {
      workload: testWorkload({
        level: "overloaded",
        activeCount: 9,
        atRiskCount: 2,
        problematicCount: 1,
      }),
      issues: [
        activeIssue(
          "UX-2962",
          "Checkout flow regression",
          "In Progress",
          "jira-person-01",
        ),
        activeIssue(
          "UX-5203",
          "Mobile nav polish",
          "In Review",
          "jira-person-01",
        ),
      ],
    }),
    visualPerson("person-02", {
      issues: [
        activeIssue(
          "UX-1201",
          "Settings IA refresh",
          "On Hold",
          "jira-person-02",
        ),
        activeIssue(
          "MET-204",
          "Payment gateway timeout handling",
          "Blocked",
          "jira-person-02",
        ),
        activeIssue(
          "MET-206",
          "Auth callback retry",
          "Blocked",
          "jira-person-02",
        ),
        activeIssue(
          "MET-207",
          "Webhook signing",
          "Blocked",
          "jira-person-02",
        ),
        // Historical attribution only — current owner is person-01
        activeIssue(
          "UX-2962",
          "Checkout flow regression",
          "In Progress",
          "jira-person-01",
        ),
      ],
    }),
    visualPerson("person-03"),
    visualPerson("person-04", {
      availability: {
        state: "vacation_soon",
        label: "Vacation soon",
        isHoliday: false,
      },
    }),
    visualPerson("person-05"),
  ];
}

function buildKpiHistory(
  teamSnapshot: TeamSnapshot,
  reportData: AuditReportData,
): KpiSnapshotFile {
  let file: KpiSnapshotFile = EMPTY_KPI_SNAPSHOT_FILE;
  const end = new Date();
  end.setUTCHours(12, 0, 0, 0);
  for (let day = 56; day >= 0; day -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - day);
    const factor = 1 + ((56 - day) % 7) * 0.08;
    const dailyReport: AuditReportData = {
      ...reportData,
      teamKpi: testKpi({
        efficiencyIndex: 64 + ((56 - day) % 5),
        completedCount: Math.round(24 + factor * 3),
        firstPassAcceptedCount: Math.round(22 + factor * 2.5),
        backflowCount: 1 + ((56 - day) % 3),
        avgProgressToReviewMs: (3.2 + ((56 - day) % 4) * 0.3) * 24 * 60 * 60 * 1000,
      }),
    };
    file = recordDailySnapshots(file, teamSnapshot, dailyReport, date);
  }
  return file;
}

function withVisualCapacityInsufficientAll(
  result: PerformanceFetchResult,
): PerformanceFetchResult {
  if (!readDashboardVisualQueryFlag("visualCapacityInsufficientAll")) {
    return result;
  }
  const patchPersons = (persons: Person[]) =>
    persons.map((person) => ({
      ...person,
      workload: testWorkload({
        level: "normal",
        capacityDataState: "insufficient_history",
        score: 0,
        capacityLoadPercent: 0,
        activeCount: person.workload?.activeCount ?? 0,
      }),
    }));

  return {
    ...result,
    teamSnapshot: {
      ...result.teamSnapshot,
      persons: patchPersons(result.teamSnapshot.persons),
    },
    historyTeamSnapshot: {
      ...result.historyTeamSnapshot,
      persons: patchPersons(result.historyTeamSnapshot.persons),
    },
  };
}

export function buildVisualPerformanceFetchResult(
  dateRangeKey: DateRangeKey,
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
): PerformanceFetchResult {
  void audience;
  void reviewTarget;
  void dateRangeKey;

  const persons = buildTeamPersons();
  const teamSnapshot: TeamSnapshot = {
    mode: "team",
    persons,
    summary: {
      available: persons.length,
      onVacation: 0,
      vacationSoon: 1,
      highWorkload: 1,
      problematic: 1,
    },
  };

  const teamKpi = testKpi({
    efficiencyIndex: 67,
    completedCount: 30,
    firstPassAcceptedCount: 28,
    backflowCount: 2,
    avgProgressToReviewMs: 3.8 * 24 * 60 * 60 * 1000,
  });

  const reportData: AuditReportData = {
    params,
    grouped: {},
    totalTransitions: 0,
    teamSummaryColumns: [],
    teamKpi,
    perUserKpi: {},
  };

  const kpiSnapshots = buildKpiHistory(teamSnapshot, reportData);

  const timeOffEntries: TimeOffEntry[] = [
    {
      employeeId: "person-04",
      name: getPerson("person-04").name,
      type: "vacation",
      startDate: "2026-03-10",
      endDate: "2026-03-14",
    },
  ];

  return withVisualCapacityInsufficientAll({
    teamSnapshot,
    historyTeamSnapshot: teamSnapshot,
    reportData,
    historyReportData: reportData,
    kpiSnapshots,
    reportParams: params,
    reportRanges: resolvePerformanceReportRanges(
      createPerformanceDateRange("30d"),
      "team",
      "team",
      3,
    ),
    identityResolution: persons.map((person) => ({
      employeeId: person.id,
      displayName: person.bamboo.displayName,
      workEmail: person.bamboo.workEmail,
      matched: true,
      matchedBy: "email",
      warnings: [],
    })),
    timeOffEntries,
    partialWarnings:
      import.meta.env?.VITE_VISUAL_FIXTURE === "1" &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("visualHomeState") ===
        "partial"
        ? ["bamboo_time_off_unavailable"]
        : [],
    lastUpdatedAt: new Date().toISOString(),
    historicalBootstrapRan: false,
    dependencyIndex: emptyDependencyIndex(),
  });
}
