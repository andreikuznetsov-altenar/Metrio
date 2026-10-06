import type { OrgResolutionResult, ResolvedEmployee } from "../services/bamboo/orgResolver";

function e(
  id: string,
  supervisorId?: string,
  jobTitle = "Member",
): ResolvedEmployee {
  return {
    id,
    displayName: id,
    firstName: id,
    lastName: "",
    workEmail: `${id}@fixture.test`,
    jobTitle,
    supervisorId,
    status: "active",
  };
}

/** IC: single employee under a manager (not shown as current user). */
export function orgRoleIcFixture(): OrgResolutionResult {
  const manager = e("mgr", undefined, "UX Team Leader");
  const self = e("ic", "mgr", "Product Designer");
  return {
    ok: true,
    mode: "personal",
    employee: self,
    directReports: [],
    fullTeam: [manager, self],
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: "id",
    ambiguousSupervisorNames: 0,
  };
}

export function orgRoleLeafManagerFixture(): OrgResolutionResult {
  const lead = e("lead", undefined, "Design Lead");
  const reports = ["a", "b", "c"].map((id) => e(id, "lead"));
  return {
    ok: true,
    mode: "team",
    employee: lead,
    directReports: reports,
    fullTeam: reports,
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: "id",
    ambiguousSupervisorNames: 0,
  };
}

export function orgRoleManagerOfManagersFixture(): OrgResolutionResult {
  const head = e("head", undefined, "Head of UX");
  const leadA = e("lead-a", "head", "Lead");
  const leadB = e("lead-b", "head", "Lead");
  const team = [e("e1", "lead-a"), e("e2", "lead-a"), e("e3", "lead-b")];
  return {
    ok: true,
    mode: "team",
    employee: head,
    directReports: [leadA, leadB],
    fullTeam: [leadA, leadB, ...team],
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: "id",
    ambiguousSupervisorNames: 0,
  };
}

export const ORG_ROLE_VISUAL_FIXTURE_KEYS = {
  ic: "org-role-ic",
  leafManager: "org-role-leaf-manager",
  managerOfManagers: "org-role-manager-of-managers",
} as const;
