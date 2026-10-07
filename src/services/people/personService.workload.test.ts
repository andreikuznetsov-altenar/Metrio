import { describe, expect, it } from "vitest";
import { buildTeamSnapshot } from "./personService";
import type { AuditReportData } from "../../domain/jira/types";
import { DEFAULT_WORKLOAD_THRESHOLDS } from "../../domain/workload/workloadEngine";
import { testKpi } from "../../domain/testFixtures";

const params = {
  dateFrom: "2026-01-01",
  dateTo: "2026-03-01",
  targetReviewDays: 3,
  users: ["lead@co.com"],
  projects: [],
};

function issue(key: string, assigneeCanonical: string) {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: "2026-01-10T10:00:00.000Z",
    assigneeName: "Lead",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "none",
    epicKey: "none",
    epicSummary: "none",
    epicStatus: "none",
    epicContentType: "none",
    epicDesignImprovementType: "none",
    currentStatus: "In Progress",
    currentAssigneeCanonical: assigneeCanonical,
    events: [
      {
        eventType: "Status" as const,
        changedAt: "2026-01-11T10:00:00.000Z",
        changedBy: "User",
        fromValue: "To Do",
        toValue: "In Progress",
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

describe("buildTeamSnapshot personal workload inputs", () => {
  it("uses ownedIssues only so grouped team issues do not inflate lead capacity", () => {
    const leadCanonical = "lead@co.com";
    const groupedIssues = [
      issue("UX-1", leadCanonical),
      issue("UX-2", "ic@co.com"),
      issue("UX-3", "ic@co.com"),
      issue("UX-4", "ic@co.com"),
    ];
    const reportData: AuditReportData = {
      params,
      grouped: {
        [leadCanonical]: {
          requestedUser: leadCanonical,
          userLabel: "Lead",
          issues: groupedIssues,
          transitionStats: {},
        },
      },
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: {
        startedCount: 0,
        completedCount: 4,
        firstPassAcceptedCount: 4,
        backflowCount: 0,
        avgProgressToReviewMs: null,
        efficiencyIndex: 80,
      },
      perUserKpi: {},
    };

    const snapshot = buildTeamSnapshot(
      {
        ok: true,
        mode: "team",
        employee: {
          id: "lead",
          displayName: "Lead",
          firstName: "Lead",
          lastName: "User",
          workEmail: leadCanonical,
          jobTitle: "Lead",
          status: "Active",
        },
        directReports: [
          {
            id: "ic",
            displayName: "IC",
            firstName: "IC",
            lastName: "User",
            workEmail: "ic@co.com",
            jobTitle: "Designer",
            status: "Active",
          },
        ],
        fullTeam: [],
        missingFields: [],
        restrictedFields: [],
        diagnostics: [],
        reportingSource: "id",
        ambiguousSupervisorNames: 0,
      },
      reportData,
      [],
      DEFAULT_WORKLOAD_THRESHOLDS,
      [{ accountId: "1", displayName: "Lead", email: leadCanonical }],
    );

    const lead = snapshot.persons.find((p) => p.id === "lead");
    const ic = snapshot.persons.find((p) => p.id === "ic");
    expect(lead?.ownedIssues).toHaveLength(1);
    expect(ic?.ownedIssues).toHaveLength(0);
    const leadPercent = lead?.personalWorkload?.capacityLoadPercent ?? 0;
    const icPercent = ic?.personalWorkload?.capacityLoadPercent ?? 0;
    expect(lead?.ownedIssues).toHaveLength(1);
    expect(lead?.issues).toHaveLength(4);
    expect(leadPercent).toBeLessThan(500);
    expect(icPercent).toBeLessThan(500);
    expect(lead?.ownedIssues.length).toBeLessThan(lead?.issues.length ?? 0);
  });

  it("keeps Andrei personal capacity off the team issue roll-up (deterministic fixture)", () => {
    const andreiCanonical = "andrei@co.com";
    const reportIssues = [
      issue("UX-5726", andreiCanonical),
      issue("UX-5203", "daria@co.com"),
      issue("UX-5204", "daria@co.com"),
      issue("UX-5205", "daria@co.com"),
    ];
    const reportData: AuditReportData = {
      params,
      grouped: {
        [andreiCanonical]: {
          requestedUser: andreiCanonical,
          userLabel: "Andrei",
          issues: reportIssues,
          transitionStats: {},
        },
        "daria@co.com": {
          requestedUser: "daria@co.com",
          userLabel: "Daria",
          issues: reportIssues.filter((i) => i.issueKey !== "UX-5726"),
          transitionStats: {},
        },
      },
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: testKpi(),
      perUserKpi: {},
    };

    const snapshot = buildTeamSnapshot(
      {
        ok: true,
        mode: "team",
        employee: {
          id: "andrei",
          displayName: "Andrei Kuznetsov",
          firstName: "Andrei",
          lastName: "Kuznetsov",
          workEmail: andreiCanonical,
          jobTitle: "Lead",
          status: "Active",
        },
        directReports: [
          {
            id: "daria",
            displayName: "Daria",
            firstName: "Daria",
            lastName: "User",
            workEmail: "daria@co.com",
            jobTitle: "Designer",
            status: "Active",
          },
        ],
        fullTeam: [],
        missingFields: [],
        restrictedFields: [],
        diagnostics: [],
        reportingSource: "id",
        ambiguousSupervisorNames: 0,
      },
      reportData,
      [],
      DEFAULT_WORKLOAD_THRESHOLDS,
      [{ accountId: "1", displayName: "Andrei", email: andreiCanonical }],
    );

    const andrei = snapshot.persons.find((p) => p.id === "andrei");
    const daria = snapshot.persons.find((p) => p.id === "daria");
    expect(andrei?.ownedIssues.map((i) => i.issueKey)).toEqual(["UX-5726"]);
    expect(daria?.ownedIssues.length).toBe(3);
    expect(andrei?.issues.length).toBeGreaterThan(andrei?.ownedIssues.length ?? 0);
    const andreiActive = andrei?.personalWorkload?.activeCount ?? 0;
    const dariaActive = daria?.personalWorkload?.activeCount ?? 0;
    expect(andreiActive).toBe(1);
    expect(dariaActive).toBe(3);
    expect(andreiActive + dariaActive).toBeLessThan(reportIssues.length + 1);
  });
});
