import { describe, expect, it } from "vitest";
import {
  buildOrgRoleTeamDetection,
  expectedOrgRoleForScenario,
  productionPathUserForScenario,
} from "./orgRoleProductionPathFixture";
import { resolveOrgRole } from "../domain/organization/orgRole";

describe("orgRoleProductionPathFixture", () => {
  it("resolves roles from Bamboo graph only", () => {
    expect(expectedOrgRoleForScenario("ic")).toBe("individual_contributor");
    expect(expectedOrgRoleForScenario("leaf")).toBe("leaf_manager");
    expect(expectedOrgRoleForScenario("mom")).toBe("manager_of_managers");
    expect(expectedOrgRoleForScenario("deep")).toBe("manager_of_managers");
    expect(expectedOrgRoleForScenario("mixed")).toBe("manager_of_managers");
  });

  it("does not promote IC to manager from job title", () => {
    const org = buildOrgRoleTeamDetection("ic");
    org.employee = { ...org.employee!, jobTitle: "Engineering Director" };
    expect(resolveOrgRole(org).role).toBe("individual_contributor");
  });

  it("mixed direct reports expose direct IC ids on user hierarchy", () => {
    const user = productionPathUserForScenario("mixed");
    expect(user?.orgHierarchy?.directIndividualContributorIds).toContain("person-09");
    expect(user?.orgHierarchy?.topLevelManagerBranches.length).toBe(1);
  });
});
