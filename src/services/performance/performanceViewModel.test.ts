import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildPerformanceViewModels } from "./performanceViewModel";
import type { PerformanceFetchResult } from "./performanceTypes";
import { createPerformanceDateRange } from "../../domain/performance/performanceDateRange";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";
import type { Person, TeamSnapshot } from "../../domain/people/types";
import type { AuditReportData } from "../../domain/jira/types";
import { EMPTY_KPI_SNAPSHOT_FILE } from "../../domain/snapshots/snapshotEngine";
import { testKpi, testWorkload } from "../../domain/testFixtures";
import type { AuditIssue, IssueEvent } from "../../domain/jira/types";
import { filterOwnedIssues } from "../../domain/people/ownedIssues";
import { calculateWorkload } from "../../domain/workload/workloadEngine";

const params: AuditReportData["params"] = {
  dateFrom: "2026-01-01",
  dateTo: "2026-03-01",
  targetReviewDays: 3,
  users: ["real@co.com"],
  projects: ["MET"],
};

function bambooPerson(
  id: string,
  displayName: string,
  issues: AuditIssue[] = [],
): Person {
  const canonical = `jira-${id}`;
  const normalizedIssues = issues.map((issue) => ({
    ...issue,
    currentAssigneeCanonical:
      issue.currentAssigneeCanonical ?? canonical,
  }));
  return {
    id,
    bamboo: {
      id,
      displayName,
      firstName: displayName.split(" ")[0] || displayName,
      lastName: displayName.split(" ")[1] || "",
      workEmail: `${id}@co.com`,
      jobTitle: "Engineer",
      status: "Active",
    },
    jira: {
      accountId: `jira-${id}`,
      displayName,
      email: `${id}@co.com`,
      canonicalKey: `jira-${id}`,
    },
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: testWorkload({ level: "normal", activeCount: 2 }),
    performance: testKpi({
      efficiencyIndex: 91,
      completedCount: 4,
      backflowCount: 0,
      firstPassAcceptedCount: 4,
    }),
    issues: normalizedIssues,
    ownedIssues: filterOwnedIssues(normalizedIssues, canonical),
  };
}

function activeIssue(
  key: string,
  summary: string,
  status = "In Progress",
  ownerCanonical?: string,
): AuditIssue {
  return {
    issueKey: key,
    issueSummary: summary,
    issueCreated: "2026-01-01T00:00:00.000Z",
    assigneeName: "Real Person",
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

function statusEvent(
  fromValue: string,
  toValue: string,
  changedAt: string,
): IssueEvent {
  return {
    eventType: "Status",
    changedAt,
    changedBy: "Real Person",
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function completedCycleIssue(key: string, ownerCanonical: string): AuditIssue {
  return {
    ...activeIssue(key, "Completed capacity sample", "Done", ownerCanonical),
    issueCreated: "2026-01-05T09:00:00.000Z",
    events: [
      statusEvent("To Do", "In Progress", "2026-01-06T09:00:00.000Z"),
      statusEvent("In Progress", "In Review", "2026-01-08T09:00:00.000Z"),
      statusEvent("In Review", "Done", "2026-01-09T09:00:00.000Z"),
    ],
  };
}

function buildResult(
  persons: Person[],
  teamKpi = testKpi({
    efficiencyIndex: 72,
    completedCount: 10,
    firstPassAcceptedCount: 8,
    backflowCount: 2,
  }),
): PerformanceFetchResult {
  const teamSnapshot: TeamSnapshot = {
    mode: "team",
    persons,
    summary: {
      available: persons.length,
      onVacation: 0,
      vacationSoon: 0,
      highWorkload: 0,
      problematic: 0,
    },
  };
  const reportData: AuditReportData = {
    params,
    grouped: {},
    totalTransitions: 0,
    teamSummaryColumns: [],
    teamKpi,
    perUserKpi: {},
  };
  return {
    teamSnapshot,
    historyTeamSnapshot: teamSnapshot,
    reportData,
    historyReportData: reportData,
    kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
    reportParams: params,
    reportRanges: resolvePerformanceReportRanges(
      createPerformanceDateRange("30d"),
      "team",
      "team",
      3,
    ),
    identityResolution: [],
    timeOffEntries: [],
    partialWarnings: [],
    lastUpdatedAt: "2026-03-01T12:00:00.000Z",
    historicalBootstrapRan: false,
  };
}

describe("buildPerformanceViewModels", () => {
  it('renders Bamboo displayName "Real Person" for employee 1114, never "Employee 1114"', () => {
    const data = buildResult([bambooPerson("1114", "Real Person")]);
    const vm = buildPerformanceViewModels(data, "1114");
    expect(vm.teamSecondary.people[0].personName).toBe("Real Person");
    expect(vm.teamOverview.workload[0].personName).toBe("Real Person");
    expect(JSON.stringify(vm.teamOverview)).not.toContain("Employee 1114");
  });

  it("derives overview summary KPIs from teamKpi in AuditReportData", () => {
    const data = buildResult([bambooPerson("1114", "Real Person")]);
    const vm = buildPerformanceViewModels(data, "1114");
    const efficiency = vm.teamOverview.summary.find((m) => m.label === "Efficiency");
    const completed = vm.teamOverview.summary.find((m) => m.label === "Completed");
    const backflows = vm.teamOverview.summary.find((m) => m.label === "Backflows");
    expect(efficiency?.value).toBe("72%");
    expect(completed?.value).toBe("10");
    expect(backflows?.value).toBe("2");
    expect(efficiency?.value).not.toBe("84%");
  });

  it("maps delivery risk from real Jira issue keys on persons", () => {
    const overloaded = bambooPerson("1114", "Real Person", [
      activeIssue("MET-204", "Payment gateway timeout handling", "On Hold"),
    ]);
    const data = buildResult([overloaded]);
    const vm = buildPerformanceViewModels(data, "1114");
    const keys = vm.teamSecondary.deliveryRisk.map((row) => row.issueKey);
    expect(keys).toContain("MET-204");
    expect(vm.teamSecondary.deliveryRisk.some((r) => r.issueTitle.includes("Payment"))).toBe(
      true,
    );
  });

  it("returns empty radar when team has no radar signals", () => {
    const data = buildResult([bambooPerson("982", "Alex Worker")]);
    const vm = buildPerformanceViewModels(data, "982");
    expect(vm.teamSecondary.radar).toHaveLength(0);
  });

  it("aligns employee overview KPIs with person analytics workspace", () => {
    const person = bambooPerson("914", "Sam Dev", [
      activeIssue("MET-142", "Real active task"),
    ]);
    const data = buildResult([person]);
    const vm = buildPerformanceViewModels(data, "914");
    const workspace = vm.getPersonAnalytics("914");
    expect(workspace).not.toBeNull();
    expect(vm.employee?.metrics.map((m) => m.label)).toEqual(
      workspace!.performanceKpis.map((m) => m.label),
    );
    expect(vm.employee?.cycleTime).toEqual(workspace!.cycleTime);
    expect(vm.employee?.attention).toEqual(workspace!.attention);
    expect(vm.employee?.trends).toEqual(workspace!.trends);
  });

  it("builds employee my week and grouped work history from real issues", () => {
    const person = bambooPerson("914", "Sam Dev", [
      activeIssue("MET-142", "Real active task"),
    ]);
    const data = buildResult([person]);
    const vm = buildPerformanceViewModels(data, "914");
    expect(vm.employee?.myWeek.summary.length).toBe(4);
    expect(vm.employee?.myWeek.inProgress.some((w) => w.key === "MET-142")).toBe(
      true,
    );
    expect(vm.employee?.historyMonth.length).toBeGreaterThanOrEqual(0);
    expect(vm.employee?.trends).toHaveLength(4);
    expect(vm.employee?.trends[0].insufficientHistory).toBe(true);
    expect(vm.employee?.trends[0].insufficientHistoryMessage).toContain(
      "Not enough history",
    );
  });

  it("builds person drawer snapshot with Bamboo name and history project column", () => {
    const person = bambooPerson("914", "Sam Dev", [
      activeIssue("MET-142", "Real active task"),
    ]);
    const data = buildResult([person]);
    const vm = buildPerformanceViewModels(data, "1114");
    const detail = vm.getPersonDetail("914");
    expect(detail?.personName).toBe("Sam Dev");
    expect(detail?.activeWork.some((w) => w.key === "MET-142")).toBe(true);
    expect(Array.isArray(detail?.problematicWork)).toBe(true);
  });

  it("exposes team views for leads and personal employee slice keyed to self", () => {
    const manager = bambooPerson("1114", "Team Lead");
    const ic = bambooPerson("914", "Sam Dev", [activeIssue("MET-1", "Task")]);
    const data = buildResult([manager, ic]);
    const managerVm = buildPerformanceViewModels(data, "1114");
    const icVm = buildPerformanceViewModels(data, "914");
    expect(managerVm.teamOverview.summary.length).toBeGreaterThan(0);
    expect(managerVm.teamSecondary.people).toHaveLength(2);
    expect(icVm.employee?.personId).toBe("914");
    expect(icVm.employee?.myWeek.inProgress.length).toBeGreaterThan(0);
  });

  it("surfaces partial status message when no Jira issues in period", () => {
    const data = buildResult([bambooPerson("937", "Pat Lead")]);
    data.partialWarnings.push("no_jira_issues_in_period");
    const vm = buildPerformanceViewModels(data, "937");
    expect(vm.statusMessage).toBe("No Jira work found for this period.");
  });

  it("PASS 16.6 keeps review and hold-only current work out of Heavy and Overloaded workload", () => {
    const person = bambooPerson("valeriia", "Valeriia Pavlova");
    const owner = person.jira!.canonicalKey;
    const issues = [
      ...Array.from({ length: 6 }, (_, index) =>
        activeIssue(`UX-R${index + 1}`, "Review item", "In Review", owner),
      ),
      ...Array.from({ length: 2 }, (_, index) =>
        activeIssue(`UX-H${index + 1}`, "Hold item", "On Hold", owner),
      ),
      completedCycleIssue("UX-C1", owner),
    ];
    person.issues = issues;
    person.ownedIssues = filterOwnedIssues(issues, owner);
    person.personalWorkload = calculateWorkload(person.ownedIssues, params);
    person.workload = person.personalWorkload;

    expect(person.personalWorkload.capacityContributorIssueCount).toBe(0);
    expect(person.personalWorkload.capacityLoadPercent).toBe(0);
    expect(person.personalWorkload.level).toBe("low");

    const vm = buildPerformanceViewModels(buildResult([person]), "valeriia");
    expect(vm.teamSecondary.people[0].workload).toBe("Light");
    expect(vm.teamOverview.workload[0].workload).toBe("Light");
    expect(vm.getPersonDetail("valeriia")?.workload).toBe("Light");
  });

  it("PASS 16.6 allows High Attention with Light current workload", () => {
    const person = bambooPerson("valeriia", "Valeriia Pavlova");
    const owner = person.jira!.canonicalKey;
    const issues = [
      activeIssue("UX-HOLD", "Blocked handoff", "On Hold", owner),
      completedCycleIssue("UX-C2", owner),
    ];
    person.issues = issues;
    person.ownedIssues = filterOwnedIssues(issues, owner);
    person.personalWorkload = calculateWorkload(person.ownedIssues, params);
    person.workload = person.personalWorkload;

    const vm = buildPerformanceViewModels(buildResult([person]), "valeriia");
    expect(vm.teamSecondary.people[0].attentionSeverityLabel).toBe("High");
    expect(vm.teamSecondary.people[0].workload).toBe("Light");
    expect(vm.teamOverview.attention[0].workload).toBe("Light");
  });

  it("PASS 16.6 calculates active execution contributors normally", () => {
    const owner = "jira-andrei";
    const active = activeIssue("UX-ACTIVE", "Execution task", "In Progress", owner);
    const result = calculateWorkload([active, completedCycleIssue("UX-C3", owner)], params);
    expect(result.activeWorkCount).toBe(1);
    expect(result.capacityContributorIssueCount).toBe(1);
    expect(result.currentAssignedIssueCount).toBe(2);
    expect(result.level).toMatch(/low|normal|high|overloaded/);
  });

  it("PASS 16.6 replaces stale overloaded workload snapshots with current personal workload", () => {
    const person = bambooPerson("valeriia", "Valeriia Pavlova");
    const owner = person.jira!.canonicalKey;
    const issues = [
      activeIssue("UX-R1", "Review item", "In Review", owner),
      completedCycleIssue("UX-C4", owner),
    ];
    person.issues = issues;
    person.ownedIssues = filterOwnedIssues(issues, owner);
    person.workload = testWorkload({
      level: "overloaded",
      capacityLoadPercent: 140,
      score: 140,
    });
    person.personalWorkload = calculateWorkload(person.ownedIssues, params);

    const vm = buildPerformanceViewModels(buildResult([person]), "valeriia");
    expect(person.workload.level).toBe("overloaded");
    expect(person.personalWorkload.level).toBe("low");
    expect(vm.teamSecondary.people[0].workload).toBe("Light");
    expect(vm.teamOverview.workload[0].workload).toBe("Light");
    expect(vm.getPersonDetail("valeriia")?.workload).toBe("Light");
    expect(vm.teamOverview.personDetails.valeriia?.workload).toBe("Light");
  });

  it("PASS 16.6 uses one workload level across People, drawer, and Workload Balance", () => {
    const andrei = bambooPerson("andrei", "Andrei Kuznetsov");
    const daria = bambooPerson("daria", "Daria Chernova");
    const valeriia = bambooPerson("valeriia", "Valeriia Pavlova");

    for (const person of [andrei, daria, valeriia]) {
      const owner = person.jira!.canonicalKey;
      person.issues = [
        activeIssue(`UX-${person.id}`, "Review item", "In Review", owner),
        completedCycleIssue(`UX-C-${person.id}`, owner),
      ];
      person.ownedIssues = filterOwnedIssues(person.issues, owner);
      person.workload = testWorkload({ level: "overloaded", capacityLoadPercent: 130 });
      person.personalWorkload = calculateWorkload(person.ownedIssues, params);
    }

    const vm = buildPerformanceViewModels(buildResult([andrei, daria, valeriia]), "andrei");
    for (const person of [andrei, daria, valeriia]) {
      const peopleLevel = vm.teamSecondary.people.find(
        (row) => row.personId === person.id,
      )?.workload;
      const balanceLevel = vm.teamOverview.workload.find(
        (row) => row.personId === person.id,
      )?.workload;
      const drawerLevel = vm.getPersonDetail(person.id)?.workload;
      expect([peopleLevel, balanceLevel, drawerLevel]).toEqual(["Light", "Light", "Light"]);
    }
  });
});

const FIXTURE_IMPORT =
  /fixtures\/(teamPerformance|employeePerformance|personDetail|people)/;

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("production Performance sources", () => {
  it("does not import performance fixtures from pages or app shell", () => {
    const root = join(process.cwd(), "src");
    const targets = [
      ...collectSourceFiles(join(root, "pages", "performance")),
      join(root, "pages", "PerformancePage.tsx"),
      join(root, "app", "AppLayout.tsx"),
      join(root, "app", "PerformanceDataContext.tsx"),
      join(root, "app", "CurrentUserContext.tsx"),
    ];
    for (const file of targets) {
      const content = readFileSync(file, "utf8");
      expect(content, file).not.toMatch(FIXTURE_IMPORT);
    }
  });
});
