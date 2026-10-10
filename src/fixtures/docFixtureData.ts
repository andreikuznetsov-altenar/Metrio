import type { CurrentUser } from "../domain/types";
import type { AuditIssue, AuditReportData } from "../domain/jira/types";
import type { Person, TeamSnapshot } from "../domain/people/types";
import type { TimeOffEntry } from "../domain/people/availability";
import type { OrgHierarchyScope } from "../domain/organization/orgRole";
import type { AppPreferences } from "../platform/preferences";
import type { DocFixtureRole } from "../platform/docFixtures";
import type { SurveyDataFile } from "../domain/survey/types";
import type { GoalsDataFile } from "../domain/goals/goalTypes";
import {
  GOALS_DATA_SCHEMA_VERSION,
} from "../domain/goals/goalTypes";
import {
  createPerformanceDateRange,
  inclusiveRangeDayCount,
  previousComparableRange,
  dateRangeKeyFromPerformanceRange,
} from "../domain/performance/performanceDateRange";
import type {
  DateRangeKey,
  PerformanceReviewTarget,
} from "../domain/performance";
import type { PerformanceAudience } from "../domain/performance/reportParams";
import { resolvePerformanceReportRanges } from "../domain/performance/reportParams";
import { EMPTY_KPI_SNAPSHOT_FILE, recordDailySnapshots } from "../domain/snapshots/snapshotEngine";
import type { KpiSnapshotFile } from "../domain/snapshots/types";
import { testKpi, testWorkload } from "../domain/testFixtures";
import { filterOwnedIssues } from "../domain/people/ownedIssues";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import { emptyDependencyIndex } from "../domain/dependencies/buildDeliveryDependencyGraph";
import { createDefaultSurveyData } from "../domain/survey/defaults";
import type { NotificationEvent } from "../platform/notificationTypes";
import type { BambooGoal, BambooGoalStatusFilter } from "../domain/goals/bambooGoalTypes";

const NOW = "2026-10-10T09:30:00.000Z";

type DocPersonId =
  | "doc-maria"
  | "doc-eleni"
  | "doc-andrei"
  | "doc-andreas"
  | "doc-nikolai"
  | "doc-luca"
  | "doc-sofia"
  | "doc-giorgos"
  | "doc-anna"
  | "doc-mark";

const PEOPLE: Record<
  DocPersonId,
  {
    name: string;
    email: string;
    title: string;
    department: string;
    supervisorId?: DocPersonId;
    role: CurrentUser["person"]["role"];
    orgRole: NonNullable<CurrentUser["orgRole"]>;
  }
> = {
  "doc-maria": {
    name: "Maria Camilleri",
    email: "maria.camilleri@metrio.example",
    title: "Junior UI/UX Designer",
    department: "Design",
    supervisorId: "doc-andrei",
    role: "employee",
    orgRole: "individual_contributor",
  },
  "doc-eleni": {
    name: "Eleni Papadopoulou",
    email: "eleni.papadopoulou@metrio.example",
    title: "Senior Product Designer",
    department: "Design",
    supervisorId: "doc-andrei",
    role: "employee",
    orgRole: "individual_contributor",
  },
  "doc-andrei": {
    name: "Andrei Morozov",
    email: "andrei.morozov@metrio.example",
    title: "UX Team Lead",
    department: "Design",
    supervisorId: "doc-andreas",
    role: "lead",
    orgRole: "leaf_manager",
  },
  "doc-andreas": {
    name: "Andreas Georgiou",
    email: "andreas.georgiou@metrio.example",
    title: "Design Manager",
    department: "Design",
    supervisorId: "doc-nikolai",
    role: "lead",
    orgRole: "manager_of_managers",
  },
  "doc-nikolai": {
    name: "Nikolai Petrov",
    email: "nikolai.petrov@metrio.example",
    title: "Director of Product Design",
    department: "Product Design",
    role: "director",
    orgRole: "manager_of_managers",
  },
  "doc-luca": {
    name: "Luca Borg",
    email: "luca.borg@metrio.example",
    title: "Product Designer",
    department: "Design",
    supervisorId: "doc-andrei",
    role: "employee",
    orgRole: "individual_contributor",
  },
  "doc-sofia": {
    name: "Sofia Ivanova",
    email: "sofia.ivanova@metrio.example",
    title: "Design Operations Specialist",
    department: "Design",
    supervisorId: "doc-andreas",
    role: "employee",
    orgRole: "individual_contributor",
  },
  "doc-giorgos": {
    name: "Giorgos Ioannou",
    email: "giorgos.ioannou@metrio.example",
    title: "UX Research Lead",
    department: "Research",
    supervisorId: "doc-andreas",
    role: "lead",
    orgRole: "leaf_manager",
  },
  "doc-anna": {
    name: "Anna Markova",
    email: "anna.markova@metrio.example",
    title: "Senior UX Researcher",
    department: "Research",
    supervisorId: "doc-giorgos",
    role: "employee",
    orgRole: "individual_contributor",
  },
  "doc-mark": {
    name: "Mark Vella",
    email: "mark.vella@metrio.example",
    title: "Product Designer",
    department: "Design",
    supervisorId: "doc-giorgos",
    role: "employee",
    orgRole: "individual_contributor",
  },
};

const rolePerson: Record<DocFixtureRole, DocPersonId> = {
  ic: "doc-maria",
  lead: "doc-andrei",
  manager: "doc-andreas",
  director: "doc-nikolai",
};

function splitName(name: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = name.split(" ");
  return { firstName, lastName: rest.join(" ") };
}

function canonical(id: DocPersonId): string {
  return `jira-${id}`;
}

function issue(
  key: `DEMO-${number}`,
  owner: DocPersonId,
  summary: string,
  status: string,
  options: {
    type?: string;
    project?: string;
    backflow?: boolean;
    created?: string;
  } = {},
): AuditIssue {
  const person = PEOPLE[owner];
  return {
    issueKey: key,
    issueSummary: summary,
    issueCreated: options.created ?? "2026-09-15T08:00:00.000Z",
    assigneeName: person.name,
    projectKey: "DEMO",
    projectName: options.project ?? "Metrio Demo",
    issueTypeName: options.type ?? "Task",
    contentType: "Product design",
    designImprovementType: "Experience",
    epicKey: "DEMO-1",
    epicSummary: "Documentation-ready product flow",
    epicStatus: "In Progress",
    epicContentType: "Product design",
    epicDesignImprovementType: "Experience",
    currentStatus: status,
    currentAssigneeCanonical: canonical(owner),
    currentAssigneeAccountId: canonical(owner),
    currentAssigneeDisplayName: person.name,
    events: [
      {
        eventType: "Status",
        changedAt: "2026-09-18T10:00:00.000Z",
        changedBy: person.name,
        fromValue: "To Do",
        toValue: status,
        timeSincePreviousStatusMs: null,
        isBackflow: options.backflow ?? false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
    rangeEvents: [],
  };
}

const ISSUES: AuditIssue[] = [
  issue("DEMO-101", "doc-maria", "Profile card spacing polish", "In Progress"),
  issue("DEMO-102", "doc-maria", "Goal detail mobile audit", "In Review"),
  issue("DEMO-103", "doc-maria", "Feedback setup empty state", "Done"),
  issue("DEMO-104", "doc-maria", "Settings icon pass", "To Do"),
  issue("DEMO-201", "doc-eleni", "Performance trend chart review", "In Review"),
  issue("DEMO-202", "doc-eleni", "Notification drawer recovery", "On Hold"),
  issue("DEMO-203", "doc-eleni", "PDF KPI alignment", "Done", { backflow: true }),
  issue("DEMO-301", "doc-luca", "Risk table action spacing", "In Progress"),
  issue("DEMO-302", "doc-luca", "Task journey dependency copy", "In Review"),
  issue("DEMO-401", "doc-sofia", "Feedback delivery checklist", "To Do"),
  issue("DEMO-402", "doc-sofia", "Onboarding resource cleanup", "Done"),
  issue("DEMO-501", "doc-anna", "Research synthesis update", "In Progress"),
  issue("DEMO-502", "doc-mark", "Design QA evidence pack", "On Hold"),
  issue("DEMO-601", "doc-andrei", "Team review coaching", "In Progress"),
  issue("DEMO-701", "doc-andreas", "Manager workload planning", "In Review"),
];

function person(
  id: DocPersonId,
  workload: NonNullable<Person["workload"]>,
  performance: NonNullable<Person["performance"]>,
  availability: Person["availability"] = {
    state: "available",
    label: "Available",
    isHoliday: false,
  },
): Person {
  const def = PEOPLE[id];
  const { firstName, lastName } = splitName(def.name);
  const personIssues = ISSUES.filter(
    (entry) => entry.currentAssigneeCanonical === canonical(id),
  );
  return {
    id,
    bamboo: {
      id,
      displayName: def.name,
      firstName,
      lastName,
      workEmail: def.email,
      jobTitle: def.title,
      department: def.department,
      supervisorId: def.supervisorId,
      supervisorEmail: def.supervisorId
        ? PEOPLE[def.supervisorId].email
        : undefined,
      hireDate: "2025-02-03",
      status: "Active",
    },
    jira: {
      accountId: canonical(id),
      displayName: def.name,
      email: def.email,
      canonicalKey: canonical(id),
    },
    identity: { matchedBy: "email", warnings: [] },
    availability,
    workload,
    personalWorkload: workload,
    performance,
    issues: personIssues,
    ownedIssues: filterOwnedIssues(personIssues, canonical(id)),
  };
}

function hierarchy(role: DocFixtureRole, currentUserId: DocPersonId): OrgHierarchyScope {
  if (role === "ic") {
    return {
      currentUserId,
      role: "individual_contributor",
      supervisorId: PEOPLE[currentUserId].supervisorId,
      directReportIds: [],
      directManagerReportIds: [],
      directIndividualContributorIds: [],
      descendantIds: [currentUserId],
      topLevelManagerBranches: [],
      maxDepthBelow: 0,
      graphWarnings: [],
    };
  }
  if (role === "lead") {
    return {
      currentUserId,
      role: "leaf_manager",
      supervisorId: "doc-andreas",
      directReportIds: ["doc-maria", "doc-eleni", "doc-luca"],
      directManagerReportIds: [],
      directIndividualContributorIds: ["doc-maria", "doc-eleni", "doc-luca"],
      descendantIds: [currentUserId, "doc-maria", "doc-eleni", "doc-luca"],
      topLevelManagerBranches: [],
      maxDepthBelow: 1,
      graphWarnings: [],
    };
  }
  if (role === "manager") {
    return {
      currentUserId,
      role: "manager_of_managers",
      supervisorId: "doc-nikolai",
      directReportIds: ["doc-andrei", "doc-giorgos", "doc-sofia"],
      directManagerReportIds: ["doc-andrei", "doc-giorgos"],
      directIndividualContributorIds: ["doc-sofia"],
      descendantIds: [
        currentUserId,
        "doc-andrei",
        "doc-maria",
        "doc-eleni",
        "doc-luca",
        "doc-giorgos",
        "doc-anna",
        "doc-mark",
        "doc-sofia",
      ],
      topLevelManagerBranches: [
        {
          managerId: "doc-andrei",
          descendantIds: ["doc-andrei", "doc-maria", "doc-eleni", "doc-luca"],
          totalPeople: 4,
        },
        {
          managerId: "doc-giorgos",
          descendantIds: ["doc-giorgos", "doc-anna", "doc-mark"],
          totalPeople: 3,
        },
      ],
      maxDepthBelow: 2,
      graphWarnings: [],
    };
  }
  return {
    currentUserId,
    role: "manager_of_managers",
    directReportIds: ["doc-andreas"],
    directManagerReportIds: ["doc-andreas"],
    directIndividualContributorIds: [],
    descendantIds: [
      currentUserId,
      "doc-andreas",
      "doc-andrei",
      "doc-maria",
      "doc-eleni",
      "doc-luca",
      "doc-giorgos",
      "doc-anna",
      "doc-mark",
      "doc-sofia",
    ],
    topLevelManagerBranches: [
      {
        managerId: "doc-andreas",
        descendantIds: [
          "doc-andreas",
          "doc-andrei",
          "doc-maria",
          "doc-eleni",
          "doc-luca",
          "doc-giorgos",
          "doc-anna",
          "doc-mark",
          "doc-sofia",
        ],
        totalPeople: 9,
      },
    ],
    maxDepthBelow: 3,
    graphWarnings: [],
  };
}

export function getDocFixtureUser(role: DocFixtureRole): CurrentUser {
  const id = rolePerson[role];
  const def = PEOPLE[id];
  const directReportIds = hierarchy(role, id).directReportIds;
  return {
    person: { id, name: def.name, role: def.role },
    jobTitle: def.title,
    orgRole: def.orgRole,
    team:
      directReportIds.length > 0
        ? { leadId: id, directReportIds }
        : undefined,
    orgHierarchy: hierarchy(role, id),
  };
}

export function buildDocPreferences(
  base: AppPreferences,
  schemaVersion: number,
  role: DocFixtureRole,
): AppPreferences {
  const user = getDocFixtureUser(role);
  const current = PEOPLE[user.person.id as DocPersonId];
  const teamIds = [
    "doc-maria",
    "doc-eleni",
    "doc-andrei",
    "doc-andreas",
    "doc-nikolai",
    "doc-luca",
    "doc-sofia",
    "doc-giorgos",
    "doc-anna",
    "doc-mark",
  ] as DocPersonId[];
  const employees = teamIds.map((id) => {
    const def = PEOPLE[id];
    const { firstName, lastName } = splitName(def.name);
    return {
      id,
      displayName: def.name,
      firstName,
      lastName,
      workEmail: def.email,
      jobTitle: def.title,
      department: def.department,
      supervisorId: def.supervisorId,
      supervisorEmail: def.supervisorId ? PEOPLE[def.supervisorId].email : undefined,
      status: "Active",
    };
  });
  return {
    ...base,
    schemaVersion,
    setup: { completed: true },
    workEmail: current.email,
    jiraEmail: current.email,
    bambooWorkEmail: current.email,
    jiraBaseUrl: "https://jira.metrio.example",
    bambooSubdomain: "metrio-demo",
    jiraIdentity: {
      accountId: canonical(user.person.id as DocPersonId),
      displayName: current.name,
      emailAddress: current.email,
      verification: "verified_email",
    },
    reportFilters: {
      ...base.reportFilters,
      dateFrom: "2026-09-01",
      dateTo: "2026-10-10",
      projects: ["DEMO"],
      teamScope: "full",
    },
    credentials: {
      ...base.credentials,
      jiraConfigured: true,
      bambooConfigured: true,
      migrationVersion: 1,
    },
    google: {
      ...base.google,
      accountEmail: "feedback.coordinator@metrio.example",
      formsConnected: true,
      gmailConnected: true,
      calendarConnected: true,
      appsScriptWebAppUrl: "https://script.google.com/macros/s/metrio-doc-fixture/exec",
    },
    teamDetection: {
      ok: true,
      mode: user.team ? "team" : "personal",
      employee: employees.find((employee) => employee.id === user.person.id),
      manager: current.supervisorId
        ? employees.find((employee) => employee.id === current.supervisorId)
        : undefined,
      directReports: employees.filter((employee) =>
        user.orgHierarchy?.directReportIds.includes(employee.id),
      ),
      fullTeam: employees.filter((employee) => employee.id !== user.person.id),
      missingFields: [],
      restrictedFields: [],
      diagnostics: ["documentation_fixture"],
      reportingSource: "id",
      ambiguousSupervisorNames: 0,
    },
  };
}

function peopleForRole(role: DocFixtureRole): Person[] {
  const all = [
    person(
      "doc-maria",
      testWorkload({
        level: "normal",
        activeCount: 2,
        activeWorkCount: 2,
        reviewCount: 1,
        holdCount: 0,
        capacityLoadPercent: 48,
        score: 48,
      }),
      testKpi({
        efficiencyIndex: 78,
        completedCount: 3,
        firstPassAcceptedCount: 2,
        backflowCount: 1,
        reviewSubmittedCount: 4,
      }),
    ),
    person(
      "doc-eleni",
      testWorkload({
        level: "low",
        activeCount: 1,
        activeWorkCount: 0,
        reviewCount: 1,
        holdCount: 1,
        capacityLoadPercent: 18,
        score: 18,
      }),
      testKpi({
        efficiencyIndex: 94,
        completedCount: 5,
        firstPassAcceptedCount: 5,
        backflowCount: 0,
        reviewSubmittedCount: 3,
      }),
    ),
    person(
      "doc-luca",
      testWorkload({
        level: "high",
        activeCount: 3,
        activeWorkCount: 2,
        reviewCount: 1,
        holdCount: 0,
        atRiskCount: 1,
        capacityLoadPercent: 82,
        score: 82,
      }),
      testKpi({
        efficiencyIndex: 86,
        completedCount: 4,
        firstPassAcceptedCount: 3,
        backflowCount: 1,
      }),
    ),
    person(
      "doc-andrei",
      testWorkload({
        level: "normal",
        activeCount: 1,
        activeWorkCount: 1,
        capacityLoadPercent: 41,
        score: 41,
      }),
      testKpi({ efficiencyIndex: 91, completedCount: 5, firstPassAcceptedCount: 5 }),
    ),
    person(
      "doc-andreas",
      testWorkload({
        level: "normal",
        activeCount: 1,
        reviewCount: 1,
        activeWorkCount: 0,
        capacityLoadPercent: 35,
        score: 35,
      }),
      testKpi({ efficiencyIndex: 93, completedCount: 4, firstPassAcceptedCount: 4 }),
    ),
    person(
      "doc-sofia",
      testWorkload({ level: "normal", activeCount: 1, activeWorkCount: 1, capacityLoadPercent: 52 }),
      testKpi({ efficiencyIndex: 89, completedCount: 3, firstPassAcceptedCount: 2 }),
    ),
    person(
      "doc-giorgos",
      testWorkload({ level: "low", activeCount: 0, capacityLoadPercent: 12, score: 12 }),
      testKpi({ efficiencyIndex: 100, completedCount: 2, firstPassAcceptedCount: 2 }),
    ),
    person(
      "doc-anna",
      testWorkload({ level: "normal", activeCount: 1, activeWorkCount: 1, capacityLoadPercent: 56 }),
      testKpi({ efficiencyIndex: 88, completedCount: 1, firstPassAcceptedCount: 1 }),
      { state: "vacation_soon", label: "Vacation soon", startDate: "2026-10-14", endDate: "2026-10-18", isHoliday: false },
    ),
    person(
      "doc-mark",
      testWorkload({ level: "low", activeCount: 0, holdCount: 1, capacityLoadPercent: 0, score: 0 }),
      testKpi({ efficiencyIndex: 82, completedCount: 1, firstPassAcceptedCount: 0, backflowCount: 1 }),
      { state: "on_vacation", label: "On vacation", startDate: "2026-10-08", endDate: "2026-10-12", isHoliday: false },
    ),
    person(
      "doc-nikolai",
      testWorkload({ level: "low", activeCount: 0, capacityLoadPercent: 8, score: 8 }),
      testKpi({ efficiencyIndex: 96, completedCount: 0, firstPassAcceptedCount: 0 }),
    ),
  ];
  if (role === "ic") return all.filter((entry) => entry.id === "doc-maria");
  if (role === "lead") {
    return all.filter((entry) =>
      ["doc-andrei", "doc-maria", "doc-eleni", "doc-luca"].includes(entry.id),
    );
  }
  if (role === "manager") {
    return all.filter((entry) =>
      [
        "doc-andreas",
        "doc-andrei",
        "doc-maria",
        "doc-eleni",
        "doc-luca",
        "doc-giorgos",
        "doc-anna",
        "doc-mark",
        "doc-sofia",
      ].includes(entry.id),
    );
  }
  return all;
}

function buildKpiHistory(teamSnapshot: TeamSnapshot, reportData: AuditReportData): KpiSnapshotFile {
  let file: KpiSnapshotFile = EMPTY_KPI_SNAPSHOT_FILE;
  const displayRange = {
    from: reportData.params.dateFrom,
    to: reportData.params.dateTo,
    preset: "custom" as const,
  };
  const comparisonRange = previousComparableRange(displayRange);
  const historyDays = inclusiveRangeDayCount(comparisonRange.from, displayRange.to);
  const end = new Date(`${displayRange.to}T12:00:00Z`);
  for (let day = historyDays - 1; day >= 0; day -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - day);
    const sequence = historyDays - 1 - day;
    const dailyReport: AuditReportData = {
      ...reportData,
      teamKpi: testKpi({
        efficiencyIndex: 86 + (sequence % 8),
        completedCount: 20 + (sequence % 9),
        firstPassAcceptedCount: 17 + (sequence % 8),
        backflowCount: sequence % 4,
        avgProgressToReviewMs: (2.1 + (sequence % 4) * 0.25) * 24 * 60 * 60 * 1000,
      }),
    };
    file = recordDailySnapshots(file, teamSnapshot, dailyReport, date);
  }
  return file;
}

export function buildDocPerformanceFetchResult(
  role: DocFixtureRole,
  dateRangeKey: DateRangeKey,
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
): PerformanceFetchResult {
  void reviewTarget;
  const displayRange = createPerformanceDateRange(dateRangeKey);
  const persons = peopleForRole(role);
  const teamSnapshot: TeamSnapshot = {
    mode: audience === "employee" ? "personal" : "team",
    persons,
    summary: {
      available: persons.filter((entry) => entry.availability.state === "available").length,
      onVacation: persons.filter((entry) => entry.availability.state === "on_vacation").length,
      vacationSoon: persons.filter((entry) => entry.availability.state === "vacation_soon").length,
      highWorkload: persons.filter(
        (entry) => entry.workload?.level === "high" || entry.workload?.level === "overloaded",
      ).length,
      problematic: persons.filter((entry) => (entry.workload?.atRiskCount ?? 0) > 0).length,
    },
  };
  const reportRanges = resolvePerformanceReportRanges(displayRange, "team", audience, 3);
  const reportData: AuditReportData = {
    params: {
      dateFrom: displayRange.from,
      dateTo: displayRange.to,
      targetReviewDays: 3,
      users: persons.map((entry) => entry.bamboo.workEmail),
      projects: ["DEMO"],
      teamScope: audience === "team" ? "full" : "direct",
    },
    grouped: Object.fromEntries(
      persons.map((entry) => [
        entry.bamboo.workEmail,
        {
          requestedUser: entry.bamboo.workEmail,
          userLabel: entry.bamboo.displayName,
          issues: entry.issues,
          transitionStats: {},
        },
      ]),
    ),
    totalTransitions: 42,
    teamSummaryColumns: [],
    teamKpi: testKpi({
      efficiencyIndex: 91,
      completedCount: 28,
      firstPassAcceptedCount: 24,
      backflowCount: 3,
      reviewSubmittedCount: 31,
      avgProgressToReviewMs: 2.4 * 24 * 60 * 60 * 1000,
      avgReviewToDoneMs: 1.1 * 24 * 60 * 60 * 1000,
    }),
    perUserKpi: Object.fromEntries(
      persons.map((entry) => [entry.bamboo.workEmail, entry.performance ?? testKpi()]),
    ),
  };
  const timeOffEntries: TimeOffEntry[] = [
    {
      employeeId: "doc-anna",
      name: PEOPLE["doc-anna"].name,
      type: "vacation",
      startDate: "2026-10-14",
      endDate: "2026-10-18",
    },
    {
      employeeId: "doc-mark",
      name: PEOPLE["doc-mark"].name,
      type: "vacation",
      startDate: "2026-10-08",
      endDate: "2026-10-12",
    },
  ];
  return {
    teamSnapshot,
    historyTeamSnapshot: teamSnapshot,
    reportData,
    historyReportData: reportData,
    kpiSnapshots: buildKpiHistory(teamSnapshot, reportData),
    reportParams: reportData.params,
    reportRanges,
    identityResolution: persons.map((entry) => ({
      employeeId: entry.id,
      displayName: entry.bamboo.displayName,
      workEmail: entry.bamboo.workEmail,
      matched: true,
      matchedBy: "email",
      warnings: [],
    })),
    timeOffEntries,
    partialWarnings: [],
    lastUpdatedAt: NOW,
    historicalBootstrapRan: false,
    dependencyIndex: emptyDependencyIndex(),
  };
}

export function buildDocPerformanceFetchResultFromRange(
  role: DocFixtureRole,
  range: Parameters<typeof dateRangeKeyFromPerformanceRange>[0],
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
): PerformanceFetchResult {
  return buildDocPerformanceFetchResult(
    role,
    dateRangeKeyFromPerformanceRange(range),
    reviewTarget,
    audience,
  );
}

export function buildDocGoalsData(): GoalsDataFile {
  return {
    schemaVersion: GOALS_DATA_SCHEMA_VERSION,
    goals: [
      {
        id: "doc_goal_maria_growth",
        title: "Strengthen self-serve product flows",
        ownerPersonId: "doc-maria",
        scope: "person",
        status: "active",
        reviewDate: "2026-11-30",
        progressMode: "linked_issue_count",
        linkedJiraIssueKeys: ["DEMO-101", "DEMO-102", "DEMO-103"],
        linkedJiraProjectKeys: ["DEMO"],
        linkedConfluencePageIds: [],
        employeeMayEditManualProgress: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "doc_goal_team_quality",
        title: "Reduce rework in design review",
        ownerPersonId: "doc-andrei",
        scope: "team",
        status: "active",
        progressMode: "linked_issue_count",
        linkedJiraIssueKeys: ["DEMO-201", "DEMO-203", "DEMO-301"],
        linkedJiraProjectKeys: ["DEMO"],
        linkedConfluencePageIds: [],
        employeeMayEditManualProgress: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    history: [],
  };
}

const DOC_BAMBOO_GOALS: BambooGoal[] = [
  {
    id: "doc-bamboo-goal-maria-growth",
    employeeId: "doc-maria",
    title: "Strengthen self-serve product flows",
    description:
      "Improve the quality and clarity of the highest-traffic self-serve design paths.",
    dueDate: "2026-11-30",
    setDate: "2026-09-01",
    startDateIsExplicit: true,
    percentComplete: 66,
    status: "in_progress",
    rawStatus: "In Progress",
    completionDate: null,
    sharedWithEmployeeIds: ["doc-andrei"],
    milestones: [
      {
        id: "doc-milestone-1",
        title: "Audit current friction points",
        completed: true,
        percentComplete: 100,
      },
      {
        id: "doc-milestone-2",
        title: "Ship revised detail drawer states",
        completed: false,
        percentComplete: 60,
      },
    ],
    hasMilestones: true,
    actions: [{ action: "view", allowed: true }],
  },
  {
    id: "doc-bamboo-goal-team-quality",
    employeeId: "doc-andrei",
    title: "Reduce rework in design review",
    description:
      "Use review evidence and task journey insights to reduce avoidable backflow.",
    dueDate: "2026-12-15",
    setDate: "2026-09-15",
    startDateIsExplicit: true,
    percentComplete: 54,
    status: "in_progress",
    rawStatus: "In Progress",
    completionDate: null,
    sharedWithEmployeeIds: ["doc-maria", "doc-eleni", "doc-luca"],
    milestones: [],
    hasMilestones: false,
    actions: [{ action: "view", allowed: true }],
  },
];

export function buildDocBambooGoals(
  employeeId: string,
  filter: BambooGoalStatusFilter = "status-inProgress",
): BambooGoal[] {
  const goals = DOC_BAMBOO_GOALS.filter((goal) => goal.employeeId === employeeId);
  if (filter === "status-all") return goals;
  if (filter === "status-completed") {
    return goals.filter((goal) => goal.status === "completed");
  }
  if (filter === "status-closed") {
    return goals.filter((goal) => goal.status === "closed");
  }
  return goals.filter((goal) => goal.status === "in_progress");
}

export function getDocBambooGoal(
  employeeId: string,
  goalId: string,
): BambooGoal | null {
  return (
    DOC_BAMBOO_GOALS.find(
      (goal) => goal.employeeId === employeeId && goal.id === goalId,
    ) ?? null
  );
}

export function buildDocSurveyData(): SurveyDataFile {
  const defaults = createDefaultSurveyData();
  return {
    schemaVersion: 2,
    defaults,
    activeSurveyId: "doc_survey_design_health",
    surveys: [
      {
        id: "doc_survey_design_health",
        cycleId: "doc_cycle_design_health",
        periodKey: "2026-10",
        templateId: "tpl_team_pulse",
        templateVersion: 1,
        dueAt: "2026-10-18T12:00:00.000Z",
        confidentiality: "identified",
        googleFormId: "doc-form-design-health",
        responderUri: "https://docs.google.com/forms/d/doc-design-health",
        createdAt: NOW,
        updatedAt: NOW,
        dateFrom: "2026-09-01",
        dateTo: "2026-10-10",
        scope: "direct",
        projects: ["DEMO"],
        title: "Design Team Collaboration Feedback",
        emailSubject: "Feedback for the design team",
        introText: defaults.introText,
        buttonLabel: defaults.buttonLabel,
        signature: defaults.signature,
        questions: defaults.questions,
        recipients: [
          {
            id: "doc_recipient_eleni",
            reporterAccountId: canonical("doc-eleni"),
            reporterName: PEOPLE["doc-eleni"].name,
            reporterEmail: PEOPLE["doc-eleni"].email,
            issueKeys: ["DEMO-201", "DEMO-202"],
            projects: ["DEMO"],
            emailSource: "jira",
            selected: true,
            status: "responded",
            sentAt: "2026-10-08T10:00:00.000Z",
            respondedAt: "2026-10-09T11:00:00.000Z",
            gmailMessageId: "doc-message-eleni",
            sendBatchId: "doc-batch-1",
            error: null,
            notes: null,
            lastReminderAt: null,
            reminderCount: 0,
            lastReminderError: null,
          },
          {
            id: "doc_recipient_luca",
            reporterAccountId: canonical("doc-luca"),
            reporterName: PEOPLE["doc-luca"].name,
            reporterEmail: PEOPLE["doc-luca"].email,
            issueKeys: ["DEMO-301", "DEMO-302"],
            projects: ["DEMO"],
            emailSource: "jira",
            selected: true,
            status: "sent",
            sentAt: "2026-10-08T10:05:00.000Z",
            respondedAt: null,
            gmailMessageId: "doc-message-luca",
            sendBatchId: "doc-batch-1",
            error: null,
            notes: null,
            lastReminderAt: null,
            reminderCount: 0,
            lastReminderError: null,
          },
        ],
        responses: [
          {
            responseId: "doc-response-1",
            createTime: "2026-10-09T11:00:00.000Z",
            lastSubmittedTime: "2026-10-09T11:05:00.000Z",
            answers: [
              {
                questionId: defaults.questions[0]?.id ?? "q1",
                googleQuestionId: null,
                questionTitle: defaults.questions[0]?.title ?? "Feedback",
                value: "Clear priorities and useful review notes.",
              },
            ],
          },
        ],
        sendBatches: [],
        status: "ready",
        questionsLocked: true,
        emailsSent: true,
        lastResponseSyncAt: NOW,
        error: null,
      },
    ],
    cycles: [
      {
        id: "doc_cycle_design_health",
        name: "Design health pulse",
        type: "pulse",
        status: "active",
        currentRunId: "doc_survey_design_health",
        cadence: { unit: "monthly", timezone: "local" },
        audienceRule: { kind: "team_direct_scope" },
        surveyTemplateId: "tpl_team_pulse",
        confidentiality: "identified",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    templates: [],
    scheduleState: {
      lastGeneratedAt: NOW,
      generatedRunIds: ["doc_survey_design_health"],
    },
  } as SurveyDataFile;
}

export function buildDocNotificationEvents(): NotificationEvent[] {
  return [
    {
      id: "doc-notification-review",
      type: "task_attention",
      createdAt: "2026-10-10T08:30:00.000Z",
      title: "Review needs attention",
      message: "DEMO-202 · Eleni Papadopoulou · In Review for 5 days",
      issueKey: "DEMO-202",
      issueTitle: "Notification drawer recovery",
      personId: "doc-eleni",
      personName: PEOPLE["doc-eleni"].name,
      target: { kind: "jira", issueKey: "DEMO-202" },
      severity: "warning",
      source: "jira",
      actionRequired: true,
    },
    {
      id: "doc-notification-feedback",
      type: "feedback_action",
      createdAt: "2026-10-10T07:45:00.000Z",
      title: "Feedback responses ready",
      message: "Design health pulse has new responses",
      target: { kind: "feedback", tab: "results" },
      severity: "info",
      source: "feedback",
      actionRequired: false,
    },
    {
      id: "doc-notification-vacation",
      type: "vacation_reminder",
      createdAt: "2026-10-10T06:15:00.000Z",
      title: "Vacation starts soon",
      message: "Anna Markova starts vacation on 14 Oct",
      personId: "doc-anna",
      personName: PEOPLE["doc-anna"].name,
      severity: "info",
      source: "bamboo",
      actionRequired: false,
    },
  ];
}

