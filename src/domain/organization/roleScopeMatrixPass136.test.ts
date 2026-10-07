import { describe, expect, it } from "vitest";
import { resolveOrgFeatureAccess } from "./orgFeatureAccess";
import { resolveDashboardVariant, resolvePerformanceVariant } from "./orgRoleRouting";
describe("Pass 13.6 role scope matrix (canonical OrgRole)", () => {
  const roles: OrgHierarchyScope["role"][] = [
    "individual_contributor",
    "leaf_manager",
    "manager_of_managers",
  ];

  it.each(roles)("documents dashboard + performance variants for %s", (role) => {
    expect(resolveDashboardVariant(role)).toBeDefined();
    expect(resolvePerformanceVariant(role)).toBeDefined();
    const access = resolveOrgFeatureAccess(role);
    expect(access).toBeDefined();
  });

  it("maps org roles to expected dashboard variants", () => {
    expect(resolveDashboardVariant("individual_contributor")).toBe("employee");
    expect(resolveDashboardVariant("leaf_manager")).toBe("team_manager");
    expect(resolveDashboardVariant("manager_of_managers")).toBe("leadership");
  });

  it("manager of managers has no Feedback tab in feature access", () => {
    expect(resolveOrgFeatureAccess("manager_of_managers").showFeedbackTab).toBe(false);
  });
});
