import { describe, expect, it } from "vitest";
import { scopeOrgForPerformance } from "./performanceDataService";
import type { OrgResolutionResult } from "../bamboo/orgResolver";

function org(partial: Partial<OrgResolutionResult>): OrgResolutionResult {
  return {
    ok: true,
    mode: "team",
    employee: {
      id: "1114",
      displayName: "Manager",
      firstName: "Manager",
      lastName: "",
      workEmail: "mgr@co.com",
      jobTitle: "Lead",
      status: "Active",
    },
    directReports: [
      {
        id: "982",
        displayName: "Report",
        firstName: "Report",
        lastName: "",
        workEmail: "rep@co.com",
        jobTitle: "Engineer",
        status: "Active",
      },
    ],
    fullTeam: [],
    warnings: [],
    ...partial,
  } as OrgResolutionResult;
}

describe("scopeOrgForPerformance", () => {
  it("limits manager scope to self and direct reports only", () => {
    const scoped = scopeOrgForPerformance(
      org({
        fullTeam: [
          {
            id: "999",
            displayName: "Other",
            firstName: "Other",
            lastName: "",
            workEmail: "other@co.com",
            jobTitle: "Engineer",
            status: "Active",
          },
        ],
      }),
    );
    expect(scoped.fullTeam).toEqual([]);
    expect(scoped.directReports).toHaveLength(1);
    expect(scoped.directReports[0].id).toBe("982");
  });
});
