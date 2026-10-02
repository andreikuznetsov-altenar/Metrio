import { describe, expect, it } from "vitest";
import { buildHomeWorkspace, resolveHomeRoleVariant } from "./buildHomeWorkspace";
import { EMPTY_JIRA_ASSIGNMENT_STATE } from "../jira/jiraAssignmentTracking";
import type { Person } from "../people/types";
import type { TeamPerformanceSnapshot } from "../performance";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: "self",
    bamboo: {
      id: "self",
      displayName: "Andrei Test",
      workEmail: "a@test.com",
      jobTitle: "Designer",
      department: "Design",
      hireDate: "2026-01-01",
    },
    jira: null,
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: null,
    performance: null,
    issues: [],
    ownedIssues: [],
    ...overrides,
  } as Person;
}

const emptyTeam: TeamPerformanceSnapshot = {
  directReportIds: ["dr1"],
  summary: [],
  attention: [],
  attentionTotalCount: 0,
  trends: [],
  workload: [],
  timeOff: [],
  personDetails: {},
};

describe("buildHomeWorkspace", () => {
  it("employee variant has no team section", () => {
    const workspace = buildHomeWorkspace({
      role: "employee",
      homeRole: "employee",
      selfPerson: person(),
      selfPersonId: "self",
      selfDisplayName: "Andrei Test",
      workspace: null,
      employeeSnapshot: null,
      teamSnapshot: emptyTeam,
      deliveryRisk: [],
      assignmentState: EMPTY_JIRA_ASSIGNMENT_STATE,
      surveyData: null,
      organizationModel: null,
      knowledgeLinks: [],
      knowledgeStatus: "idle",
      reportParams: undefined,
      teamPersons: [person()],
    });
    expect(workspace.role).toBe("employee");
    expect(workspace.team).toBeUndefined();
  });

  it("manager variant includes team actions cap", () => {
    const workspace = buildHomeWorkspace({
      role: "lead",
      homeRole: "manager",
      selfPerson: person(),
      selfPersonId: "self",
      selfDisplayName: "Lead",
      workspace: null,
      employeeSnapshot: null,
      teamSnapshot: emptyTeam,
      deliveryRisk: [],
      assignmentState: EMPTY_JIRA_ASSIGNMENT_STATE,
      surveyData: null,
      organizationModel: null,
      knowledgeLinks: [],
      knowledgeStatus: "ready",
      reportParams: undefined,
      teamPersons: [person()],
    });
    expect(workspace.team).toBeDefined();
    expect(workspace.team!.actions.length).toBeLessThanOrEqual(5);
  });

  it("director without organization scope resolves to manager home role", () => {
    expect(resolveHomeRoleVariant("director", null)).toBe("manager");
  });
});
