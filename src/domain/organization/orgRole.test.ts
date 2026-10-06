import { describe, expect, it } from "vitest";
import type { OrgResolutionResult, ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { buildOrgGraph, collectDescendantIds } from "./orgGraph";
import {
  resolveOrgHierarchyScope,
  resolveOrgRole,
  resolveOrgRoleFromGraph,
} from "./orgRole";

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
    workEmail: `${id}@example.com`,
    jobTitle,
    supervisorId,
    status: "active",
  };
}

function org(partial: Partial<OrgResolutionResult> & { employee: ResolvedEmployee }): OrgResolutionResult {
  return {
    ok: true,
    mode: "team",
    directReports: [],
    fullTeam: [],
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: "id",
    ambiguousSupervisorNames: 0,
    ...partial,
  };
}

describe("resolveOrgRole", () => {
  it("classifies individual contributor (Employee A under Lead)", () => {
    const lead = emp("lead", undefined, "Lead");
    const a = emp("a", "lead", "IC");
    const result = resolveOrgRole(
      org({ employee: a, directReports: [], fullTeam: [lead, a] }),
    );
    expect(result).toEqual({ ok: true, role: "individual_contributor" });
  });

  it("classifies leaf manager (Lead with IC reports only)", () => {
    const lead = emp("lead", undefined, "Lead");
    const reports = [emp("a", "lead"), emp("b", "lead"), emp("c", "lead")];
    const result = resolveOrgRole(
      org({
        employee: lead,
        directReports: reports,
        fullTeam: reports,
      }),
    );
    expect(result).toEqual({ ok: true, role: "leaf_manager" });
  });

  it("classifies manager of managers (Head with Lead branches)", () => {
    const head = emp("head", undefined, "Head");
    const leadA = emp("lead-a", "head", "Lead");
    const leadB = emp("lead-b", "head", "Lead");
    const e1 = emp("e1", "lead-a");
    const e2 = emp("e2", "lead-a");
    const e3 = emp("e3", "lead-b");
    const result = resolveOrgRole(
      org({
        employee: head,
        directReports: [leadA, leadB],
        fullTeam: [leadA, leadB, e1, e2, e3],
      }),
    );
    expect(result).toEqual({ ok: true, role: "manager_of_managers" });
    const hierarchy = resolveOrgHierarchyScope(
      org({
        employee: head,
        directReports: [leadA, leadB],
        fullTeam: [leadA, leadB, e1, e2, e3],
      }),
    );
    expect(hierarchy?.topLevelManagerBranches.map((b) => b.managerId).sort()).toEqual([
      "lead-a",
      "lead-b",
    ]);
    const branchA = hierarchy?.topLevelManagerBranches.find((b) => b.managerId === "lead-a");
    expect(branchA?.descendantIds.sort()).toEqual(["e1", "e2", "lead-a"]);
  });

  it("supports deep hierarchy (Executive sees Director branch only)", () => {
    const executive = emp("exec");
    const director = emp("director", "exec", "Director");
    const head = emp("head", "director");
    const lead = emp("lead", "head");
    const employee = emp("employee", "lead");
    const hierarchy = resolveOrgHierarchyScope(
      org({
        employee: executive,
        directReports: [director],
        fullTeam: [director, head, lead, employee],
      }),
    );
    expect(hierarchy?.role).toBe("manager_of_managers");
    expect(hierarchy?.topLevelManagerBranches).toHaveLength(1);
    expect(hierarchy?.topLevelManagerBranches[0].managerId).toBe("director");
    const directorBranch = hierarchy?.topLevelManagerBranches[0].descendantIds.sort();
    expect(directorBranch).toEqual(["director", "employee", "head", "lead"]);
  });

  it("mixed direct reports: leadership branches exclude direct IC", () => {
    const director = emp("director");
    const head = emp("head", "director");
    const analyst = emp("analyst", "director");
    const e1 = emp("e1", "head");
    const hierarchy = resolveOrgHierarchyScope(
      org({
        employee: director,
        directReports: [head, analyst],
        fullTeam: [head, analyst, e1],
      }),
    );
    expect(hierarchy?.role).toBe("manager_of_managers");
    expect(hierarchy?.topLevelManagerBranches.map((b) => b.managerId)).toEqual(["head"]);
    expect(hierarchy?.directIndividualContributorIds).toEqual(["analyst"]);
    expect(hierarchy?.descendantIds).toContain("analyst");
  });

  it("does not infer role from job title (Director title, no reports)", () => {
    const titled = emp("solo", undefined, "Director of Everything");
    expect(resolveOrgRole(org({ employee: titled }))).toEqual({
      ok: true,
      role: "individual_contributor",
    });
  });

  it("does not infer role from job title (Designer title, has manager report)", () => {
    const manager = emp("mgr", undefined, "Designer");
    const ic = emp("ic", "mgr", "Designer");
    expect(
      resolveOrgRole(
        org({ employee: manager, directReports: [ic], fullTeam: [ic] }),
      ),
    ).toEqual({ ok: true, role: "leaf_manager" });
    const subLead = emp("sub-lead", undefined, "Designer");
    const subIc = emp("sub-ic", "sub-lead");
    expect(
      resolveOrgRole(
        org({
          employee: subLead,
          directReports: [subIc],
          fullTeam: [subIc],
        }),
      ),
    ).toEqual({ ok: true, role: "leaf_manager" });
    const nested = emp("nested", "sub-lead");
    const nestedIc = emp("nested-ic", "nested");
    expect(
      resolveOrgRole(
        org({
          employee: subLead,
          directReports: [nested],
          fullTeam: [nested, nestedIc],
        }),
      ),
    ).toEqual({ ok: true, role: "manager_of_managers" });
  });

  it("cycle protection avoids infinite recursion", () => {
    const a = emp("a", "b");
    const b = emp("b", "a");
    const graph = buildOrgGraph([a, b]);
    const warnings = collectDescendantIds("a", graph);
    expect(warnings.length).toBeGreaterThanOrEqual(0);
    const role = resolveOrgRoleFromGraph("a", graph);
    expect(role.ok).toBe(true);
  });
});

describe("aggregation deduplication", () => {
  it("counts unique people per branch without double counting parent tree", () => {
    const head = emp("head");
    const leadA = emp("lead-a", "head");
    const leadB = emp("lead-b", "head");
    const e1 = emp("e1", "lead-a");
    const e2 = emp("e2", "lead-b");
    const hierarchy = resolveOrgHierarchyScope(
      org({
        employee: head,
        directReports: [leadA, leadB],
        fullTeam: [leadA, leadB, e1, e2],
      }),
    );
    const allBranchPeople = new Set(
      hierarchy?.topLevelManagerBranches.flatMap((b) => b.descendantIds) ?? [],
    );
    expect(allBranchPeople.size).toBe(4);
    expect(hierarchy?.descendantIds.length).toBe(5);
  });
});
