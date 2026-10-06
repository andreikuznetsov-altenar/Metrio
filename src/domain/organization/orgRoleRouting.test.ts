import { describe, expect, it } from "vitest";
import {
  homeRoleVariantFromOrgRole,
  resolveDashboardVariant,
  resolvePerformanceVariant,
} from "./orgRoleRouting";

describe("orgRoleRouting", () => {
  it("maps org roles to dashboard variants", () => {
    expect(resolveDashboardVariant("individual_contributor")).toBe("employee");
    expect(resolveDashboardVariant("leaf_manager")).toBe("team_manager");
    expect(resolveDashboardVariant("manager_of_managers")).toBe("leadership");
  });

  it("maps org roles to performance variants", () => {
    expect(resolvePerformanceVariant("individual_contributor")).toBe("self");
    expect(resolvePerformanceVariant("leaf_manager")).toBe("direct_team");
    expect(resolvePerformanceVariant("manager_of_managers")).toBe(
      "leadership_branches",
    );
  });

  it("maps org roles to home role variants", () => {
    expect(homeRoleVariantFromOrgRole("individual_contributor")).toBe("employee");
    expect(homeRoleVariantFromOrgRole("leaf_manager")).toBe("manager");
    expect(homeRoleVariantFromOrgRole("manager_of_managers")).toBe("director");
  });
});
