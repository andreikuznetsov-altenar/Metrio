import { describe, expect, it } from "vitest";
import {
  canAccessOrganizationScope,
  resolveAuthorizedPeopleScope,
} from "./authorizedPeopleScope";
import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";

function org(partial: Partial<OrgResolutionResult>): OrgResolutionResult {
  return {
    ok: true,
    mode: "team",
    employee: {
      id: "dir-1",
      displayName: "Director",
      firstName: "D",
      lastName: "R",
      workEmail: "dir@co.com",
      jobTitle: "Engineering Director",
      status: "Active",
    },
    directReports: [
      {
        id: "rep-1",
        displayName: "Report",
        firstName: "R",
        lastName: "1",
        workEmail: "rep@co.com",
        jobTitle: "Engineer",
        status: "Active",
      },
    ],
    fullTeam: [
      {
        id: "indirect-1",
        displayName: "Indirect",
        firstName: "I",
        lastName: "1",
        workEmail: "ind@co.com",
        jobTitle: "Engineer",
        status: "Active",
      },
    ],
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: "id",
    ambiguousSupervisorNames: 0,
    ...partial,
  };
}

describe("resolveAuthorizedPeopleScope", () => {
  it("keeps employee on self scope", () => {
    const scope = resolveAuthorizedPeopleScope(org({}), "employee", []);
    expect(scope.mode).toBe("self");
    expect(scope.personIds).toEqual(["dir-1"]);
  });

  it("keeps manager on direct reports without org config", () => {
    const scope = resolveAuthorizedPeopleScope(org({}), "lead", []);
    expect(scope.mode).toBe("direct_reports");
    expect(scope.personIds).toEqual(["dir-1", "rep-1"]);
  });

  it("does not grant organization scope to director without explicit ids", () => {
    const scope = resolveAuthorizedPeopleScope(org({}), "director", []);
    expect(scope.mode).toBe("direct_reports");
    expect(scope.personIds).not.toContain("indirect-1");
  });

  it("grants organization scope only with explicit configured ids", () => {
    const scope = resolveAuthorizedPeopleScope(org({}), "director", [
      "indirect-1",
      "rep-1",
    ]);
    expect(scope.mode).toBe("organization");
    expect(scope.source).toBe("explicit_config");
    expect(scope.personIds).toEqual(["indirect-1", "rep-1"]);
  });

  it("job title alone cannot unlock organization scope", () => {
    const scope = resolveAuthorizedPeopleScope(
      org({
        employee: {
          id: "x",
          displayName: "Head of Design",
          firstName: "H",
          lastName: "D",
          workEmail: "head@co.com",
          jobTitle: "Head of Design",
          status: "Active",
        },
      }),
      "lead",
      [],
    );
    expect(scope.mode).toBe("direct_reports");
    expect(canAccessOrganizationScope("lead", scope)).toBe(false);
  });
});
