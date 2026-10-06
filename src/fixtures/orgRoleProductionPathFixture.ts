/**
 * Production-path org role scenarios for Playwright (teamDetection → graph → OrgRole).
 */
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_SCHEMA_VERSION,
  type AppPreferences,
} from "../platform/preferences";
import type { OrgResolutionResult, ResolvedEmployee } from "../services/bamboo/orgResolver";
import { buildCurrentUserFromTeamDetection } from "../domain/currentUser/fromTeamDetection";
import { resolveOrgRole } from "../domain/organization/orgRole";

export const ORG_ROLE_SCENARIO_STORAGE_KEY = "metrio-org-role-scenario";
export const ORG_ROLE_PRODUCTION_PATH_KEY = "metrio-org-role-production-path";

export type OrgRoleScenarioId =
  | "ic"
  | "leaf"
  | "mom"
  | "deep"
  | "mixed"
  | "branch-capacity"
  | "branch-recommendations";

function emp(
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

function orgResult(
  employee: ResolvedEmployee,
  roster: ResolvedEmployee[],
): OrgResolutionResult {
  const directReports = roster.filter((p) => p.supervisorId === employee.id);
  return {
    ok: true,
    mode: directReports.length > 0 ? "team" : "personal",
    employee,
    directReports,
    fullTeam: roster.filter((p) => p.id !== employee.id),
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: "id",
    ambiguousSupervisorNames: 0,
  };
}

export function buildOrgRoleTeamDetection(
  scenario: OrgRoleScenarioId,
): OrgResolutionResult {
  switch (scenario) {
    case "ic": {
      const lead = emp("person-sam", undefined, "Lead A");
      const self = emp("person-alex", "person-sam", "Employee A");
      return orgResult(self, [lead, self]);
    }
    case "leaf": {
      const lead = emp("person-sam", undefined, "Lead A");
      const reports = ["person-01", "person-02", "person-03"].map((id) =>
        emp(id, "person-sam"),
      );
      return orgResult(lead, [lead, ...reports]);
    }
    case "mom":
    case "branch-capacity":
    case "branch-recommendations": {
      const head = emp("person-jordan", undefined, "Head");
      const leadA = emp("person-06", "person-jordan", "Lead A");
      const leadB = emp("person-08", "person-jordan", "Lead B");
      const e1 = emp("person-07", "person-06", "Employee 1");
      const e2 = emp("person-01", "person-06", "Employee 2");
      const e3 = emp("person-09", "person-08", "Employee 3");
      return orgResult(head, [head, leadA, leadB, e1, e2, e3]);
    }
    case "deep": {
      const executive = emp("person-jordan", undefined, "Executive");
      const director = emp("person-06", "person-jordan", "Director");
      const head = emp("person-08", "person-06", "Head");
      const lead = emp("person-07", "person-08", "Lead");
      const e1 = emp("person-01", "person-07", "Employee A");
      const e2 = emp("person-02", "person-07", "Employee B");
      return orgResult(executive, [executive, director, head, lead, e1, e2]);
    }
    case "mixed": {
      const director = emp("person-jordan", undefined, "Director");
      const headProduct = emp("person-06", "person-jordan", "Head Product");
      const lead = emp("person-07", "person-06", "Lead");
      const employee = emp("person-01", "person-07", "Employee");
      const analyst = emp("person-09", "person-jordan", "Analyst");
      return orgResult(director, [director, headProduct, lead, employee, analyst]);
    }
    default:
      return buildOrgRoleTeamDetection("ic");
  }
}

export function serializeOrgRoleScenarioPrefsForPlaywright(
  scenario: OrgRoleScenarioId,
): string {
  const teamDetection = buildOrgRoleTeamDetection(scenario);
  const prefs: AppPreferences = {
    ...DEFAULT_PREFERENCES,
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    setup: { completed: true },
    teamDetection,
    google: {
      ...DEFAULT_PREFERENCES.google,
      accountEmail: "visual@fixture.test",
      formsConnected: scenario === "leaf" || scenario === "ic",
      gmailConnected: scenario === "leaf" || scenario === "ic",
    },
    credentials: {
      jiraConfigured: true,
      bambooConfigured: true,
      migrationVersion: 1,
    },
  };
  return JSON.stringify(prefs);
}

export function expectedOrgRoleForScenario(
  scenario: OrgRoleScenarioId,
): string {
  const role = resolveOrgRole(buildOrgRoleTeamDetection(scenario));
  return role.ok ? role.role : "unresolved";
}

export function productionPathUserForScenario(scenario: OrgRoleScenarioId) {
  return buildCurrentUserFromTeamDetection(buildOrgRoleTeamDetection(scenario));
}
