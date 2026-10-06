import { describe, expect, it, beforeEach } from "vitest";
import {
  resetOrgHierarchyCache,
  resolveOrgHierarchyScopeCached,
  teamDetectionReportingSignature,
} from "./orgHierarchyCache";

function org(links: Array<{ id: string; supervisorId?: string }>) {
  const employee = links[0];
  const directReports = links.filter((p) => p.supervisorId === employee.id);
  return {
    ok: true as const,
    mode: "team" as const,
    employee: { ...employee, displayName: employee.id, firstName: employee.id, lastName: "", workEmail: `${employee.id}@t.com`, jobTitle: "Lead", status: "active" as const },
    directReports: directReports.map((p) => ({
      ...p,
      displayName: p.id,
      firstName: p.id,
      lastName: "",
      workEmail: `${p.id}@t.com`,
      jobTitle: "IC",
      status: "active" as const,
    })),
    fullTeam: links.slice(1).map((p) => ({
      ...p,
      displayName: p.id,
      firstName: p.id,
      lastName: "",
      workEmail: `${p.id}@t.com`,
      jobTitle: "IC",
      status: "active" as const,
    })),
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: "id" as const,
    ambiguousSupervisorNames: 0,
  };
}

describe("orgHierarchyCache", () => {
  beforeEach(() => resetOrgHierarchyCache());

  it("recomputes scope when reporting links change", () => {
    const leaf = org([
      { id: "lead", supervisorId: "dir" },
      { id: "ic", supervisorId: "lead" },
      { id: "dir" },
    ]);
    const first = resolveOrgHierarchyScopeCached(leaf);
    expect(first?.role).toBe("leaf_manager");

    const head = org([
      { id: "head" },
      { id: "lead-a", supervisorId: "head" },
      { id: "lead-b", supervisorId: "head" },
      { id: "e1", supervisorId: "lead-a" },
      { id: "e2", supervisorId: "lead-b" },
    ]);
    const sigBefore = teamDetectionReportingSignature(leaf);
    const sigAfter = teamDetectionReportingSignature(head);
    expect(sigBefore).not.toBe(sigAfter);

    const mom = resolveOrgHierarchyScopeCached(head);
    expect(mom?.role).toBe("manager_of_managers");
    expect(mom?.topLevelManagerBranches.length).toBe(2);
  });
});
