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
import {
  createPerformanceDateRange,
  inclusiveRangeDayCount,
  previousComparableRange,
} from "../domain/performance/performanceDateRange";
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
import {
  ORG_ROLE_SCENARIO_STORAGE_KEY,
  type OrgRoleScenarioId,
} from "./orgRoleProductionPathFixture";

const VISUAL_TEAM_IDS = [
  "person-sam",
  "person-alex",
  "person-jordan",
  "person-01",
  "person-02",
  "person-03",
  "person-04",
  "person-05",
  "person-06",
  "person-07",
  "person-08",
  "person-09",
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
  withStatusHistory = false,
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
    events: withStatusHistory
      ? [
          {
            eventType: "Status",
            changedAt: "2026-02-10T10:00:00.000Z",
            changedBy: "Visual",
            fromValue: "To Do",
            toValue: status,
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ]
      : [],
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

function readOrgRoleScenario(): OrgRoleScenarioId | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ORG_ROLE_SCENARIO_STORAGE_KEY);
  if (
    raw === "ic" ||
    raw === "leaf" ||
    raw === "mom" ||
    raw === "deep" ||
    raw === "mixed" ||
    raw === "branch-capacity" ||
    raw === "branch-recommendations"
  ) {
    return raw;
  }
  return null;
}

function directorRosterPersons(): Person[] {
  const scenario = readOrgRoleScenario();
  const base = [
    visualPerson("person-jordan", {
      jobTitle: "Head of Design",
      department: "Design",
    }),
    visualPerson("person-06", { jobTitle: "Lead A" }),
    visualPerson("person-07", { jobTitle: "Employee 1" }),
    visualPerson("person-08", { jobTitle: "Lead B" }),
    visualPerson("person-09", { jobTitle: "Employee 3" }),
  ];
  if (scenario === "branch-capacity") {
    return [
      ...base.slice(0, 2),
      visualPerson("person-07", {
        jobTitle: "Employee 1",
        workload: testWorkload({
          level: "high",
          capacityDataState: "measured",
          activeCount: 5,
        }),
      }),
      visualPerson("person-08", { jobTitle: "Lead B" }),
      visualPerson("person-01", {
        jobTitle: "Employee 2",
        workload: testWorkload({
          level: "normal",
          capacityDataState: "measured",
          activeCount: 4,
        }),
      }),
      visualPerson("person-02", {
        jobTitle: "Balanced",
        workload: testWorkload({
          level: "normal",
          capacityDataState: "measured",
          activeCount: 3,
        }),
      }),
      visualPerson("person-03", {
        workload: testWorkload({
          level: "normal",
          capacityDataState: "insufficient_history",
          activeCount: 2,
        }),
      }),
      visualPerson("person-04", {
        workload: testWorkload({
          level: "normal",
          capacityDataState: "insufficient_history",
          activeCount: 1,
        }),
      }),
      visualPerson("person-05", {
        workload: testWorkload({
          level: "normal",
          capacityDataState: "insufficient_history",
          activeCount: 1,
        }),
      }),
      visualPerson("person-09", {
        jobTitle: "Employee 3",
        workload: testWorkload({
          level: "low",
          capacityDataState: "measured",
          activeCount: 2,
        }),
      }),
    ];
  }
  if (scenario === "branch-recommendations") {
    return base.map((person) => {
      if (person.id === "person-07" || person.id === "person-01") {
        const issues = ["UX-9001", "UX-9002", "UX-9003", "UX-9004"].map((key) =>
          activeIssue(key, "Long review item", "In Review", `jira-${person.id}`),
        );
        return {
          ...person,
          issues,
          ownedIssues: filterOwnedIssues(issues, `jira-${person.id}`),
        };
      }
      if (person.id === "person-09") {
        return {
          ...person,
          availability: {
            state: "vacation_soon",
            label: "Away soon",
            isHoliday: false,
          },
        };
      }
      return person;
    });
  }
  return base;
}

function buildTeamPersons(): Person[] {
  const scenario = readOrgRoleScenario();
  if (scenario === "ic") {
    return [
      visualPerson("person-sam", { jobTitle: "Lead A", department: "Design" }),
      visualPerson("person-alex", {
        jobTitle: "Employee A",
        department: "Design",
      }),
    ];
  }
  if (
    scenario === "mom" ||
    scenario === "deep" ||
    scenario === "mixed" ||
    scenario === "branch-capacity" ||
    scenario === "branch-recommendations"
  ) {
    const roster = directorRosterPersons();
    if (scenario === "mixed") {
      return roster;
    }
    return roster;
  }
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
          true,
        ),
        activeIssue(
          "UX-5203",
          "Mobile nav polish",
          "In Review",
          "jira-person-01",
          true,
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
          true,
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
  const displayRange = {
    from: reportData.params.dateFrom,
    to: reportData.params.dateTo,
    preset: "custom" as const,
  };
  const comparisonRange = previousComparableRange(displayRange);
  const historyDays = inclusiveRangeDayCount(
    comparisonRange.from,
    displayRange.to,
  );
  const end = new Date(`${displayRange.to}T12:00:00Z`);
  end.setUTCHours(12, 0, 0, 0);
  for (let day = historyDays - 1; day >= 0; day -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - day);
    const sequence = historyDays - 1 - day;
    const factor = 1 + (sequence % 7) * 0.08;
    const dailyReport: AuditReportData = {
      ...reportData,
      teamKpi: testKpi({
        efficiencyIndex: 64 + (sequence % 5),
        completedCount: Math.round(24 + factor * 3),
        firstPassAcceptedCount: Math.round(22 + factor * 2.5),
        backflowCount: 1 + (sequence % 3),
        avgProgressToReviewMs: (3.2 + (sequence % 4) * 0.3) * 24 * 60 * 60 * 1000,
      }),
    };
    file = recordDailySnapshots(file, teamSnapshot, dailyReport, date);
    const dateKey = date.toISOString().slice(0, 10);
    let completed = 0;
    let firstPass = 0;
    let backflows = 0;
    let cycleMsSum = 0;
    let completedWithCycle = 0;
    file.personSnapshots
      .filter((snapshot) => snapshot.date === dateKey)
      .forEach((snapshot, personIndex) => {
        const acceptedFirstPass = (sequence + personIndex) % 4 !== 0;
        const cycleDays = 2 + ((sequence + personIndex) % 4);
        const backflow = acceptedFirstPass ? 0 : 1;
        snapshot.completedOnDate = 1;
        snapshot.firstPassOnDate = acceptedFirstPass ? 1 : 0;
        snapshot.backflowsOnDate = backflow;
        snapshot.cycleMsSumOnDate = cycleDays * 24 * 60 * 60 * 1000;
        snapshot.completedWithCycleOnDate = 1;
        completed += 1;
        firstPass += snapshot.firstPassOnDate;
        backflows += backflow;
        cycleMsSum += snapshot.cycleMsSumOnDate;
        completedWithCycle += 1;
      });
    const teamDay = file.teamSnapshots.find((snapshot) => snapshot.date === dateKey);
    if (teamDay) {
      teamDay.completedOnDate = completed;
      teamDay.firstPassOnDate = firstPass;
      teamDay.backflowsOnDate = backflows;
      teamDay.cycleMsSumOnDate = cycleMsSum;
      teamDay.completedWithCycleOnDate = completedWithCycle;
    }
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
  const displayRange = createPerformanceDateRange(dateRangeKey);
  const reportRanges = resolvePerformanceReportRanges(
    displayRange,
    "team",
    "team",
    3,
  );

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
    params: {
      ...params,
      dateFrom: displayRange.from,
      dateTo: displayRange.to,
    },
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
    reportParams: reportData.params,
    reportRanges,
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
