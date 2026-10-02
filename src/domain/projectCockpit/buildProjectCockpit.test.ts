import { describe, expect, it } from "vitest";
import { buildKpiFromIssues } from "../jira/kpi";
import type { AuditIssue } from "../jira/types";
import type { Person, TeamSnapshot } from "../people/types";
import type { CurrentUser } from "../types";
import { buildProjectCockpit } from "./buildProjectCockpit";
import { collectIssuesForScope } from "./collectProjectIssues";

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

function completedIssue(key: string, completedAt: string, backflow = false): AuditIssue {
  const events = [
    statusEvent("2024-01-02T09:00:00.000Z", "To Do", "In Progress"),
    statusEvent("2024-01-03T09:00:00.000Z", "In Progress", "Review"),
  ];
  if (backflow) {
    events.push(statusEvent("2024-01-03T12:00:00.000Z", "Review", "In Progress", true));
    events.push(statusEvent("2024-01-04T09:00:00.000Z", "In Progress", "Review"));
  }
  events.push(statusEvent(completedAt, "Review", "Done"));
  return {
    issueKey: key,
    issueSummary: `Summary ${key}`,
    issueCreated: "2024-01-01T10:00:00.000Z",
    assigneeName: "Alex",
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

function activeIssue(key: string, status = "In Progress"): AuditIssue {
  return {
    issueKey: key,
    issueSummary: `Active ${key}`,
    issueCreated: "2024-01-01T10:00:00.000Z",
    assigneeName: "Alex",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "none",
    epicKey: "none",
    epicSummary: "none",
    epicStatus: "none",
    epicContentType: "none",
    epicDesignImprovementType: "none",
    currentStatus: status,
    events: [
      statusEvent("2024-01-05T09:00:00.000Z", "To Do", status),
    ],
    rangeEvents: [],
  };
}

const params = {
  dateFrom: "2024-01-01",
  dateTo: "2024-01-31",
  targetReviewDays: 3,
  users: ["alex"],
  projects: ["UX"],
};

function snapshotWith(issues: AuditIssue[]): TeamSnapshot {
  const person: Person = {
    id: "p1",
    bamboo: {
      id: "p1",
      displayName: "Alex Morgan",
      jobTitle: "Designer",
      workEmail: "alex@co.com",
    },
    issues,
    ownedIssues: issues,
    availability: { state: "available", label: "Available" },
  } as Person;
  return {
    persons: [person],
    directReportIds: ["p1"],
  } as TeamSnapshot;
}

const managerUser = {
  person: { id: "mgr", role: "manager" },
  team: { id: "t1" },
} as CurrentUser;

describe("buildProjectCockpit KPI parity", () => {
  it("matches buildKpiFromIssues for project issue universe", () => {
    const issues = [
      completedIssue("UX-1", "2024-01-10T09:00:00.000Z"),
      completedIssue("UX-2", "2024-01-12T09:00:00.000Z", true),
      activeIssue("UX-3", "In Review"),
      activeIssue("WEB-1", "In Progress"),
    ];
    const snapshot = snapshotWith(issues);
    const scoped = collectIssuesForScope(snapshot, {
      kind: "project",
      projectKey: "UX",
    });
    const kpiDirect = buildKpiFromIssues(scoped, {}, params);
    const cockpit = buildProjectCockpit({
      scope: { kind: "project", projectKey: "UX" },
      snapshot,
      params,
      projects: [{ key: "UX", name: "UX Platform", jiraUrl: "https://jira/UX" }],
      knowledgeLinks: [],
      currentUser: managerUser,
      jiraBaseUrl: "https://jira",
    });

    expect(cockpit.kpis.find((k) => k.label === "Completed")?.value).toBe(
      String(kpiDirect.completedCount),
    );
    expect(cockpit.kpis.find((k) => k.label === "Backflows")?.value).toBe(
      String(kpiDirect.backflowCount),
    );
    expect(cockpit.summary.completedInPeriod).toBe(kpiDirect.completedCount);
    expect(cockpit.deliveryFlow.backflow).toBe(kpiDirect.backflowCount);
  });
});

describe("buildProjectCockpit access", () => {
  it("does not allow person drawer for employee viewing unrelated assignee", () => {
    const issues = [activeIssue("UX-9", "In Progress")];
    const snapshot = snapshotWith(issues);
    const employee = {
      person: { id: "other", role: "employee" },
    } as CurrentUser;
    const cockpit = buildProjectCockpit({
      scope: { kind: "project", projectKey: "UX" },
      snapshot,
      params,
      projects: [],
      knowledgeLinks: [],
      currentUser: employee,
      jiraBaseUrl: "https://jira",
    });
    expect(cockpit.people[0]?.canOpenPerson).toBe(false);
    expect(cockpit.workRows[0]?.canOpenPerson).toBe(false);
  });
});
