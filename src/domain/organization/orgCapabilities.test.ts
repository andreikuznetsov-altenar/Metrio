import { describe, expect, it } from "vitest";
import { resolveOrgCapabilities } from "./orgCapabilities";

describe("resolveOrgCapabilities", () => {
  it("aligns dashboard and performance variants per role", () => {
    const mom = resolveOrgCapabilities("manager_of_managers");
    expect(mom.dashboardVariant).toBe("leadership");
    expect(mom.performanceVariant).toBe("leadership_branches");
    expect(mom.canViewSurveyManagement).toBe(false);
    expect(mom.canViewLeadershipBranches).toBe(true);

    const leaf = resolveOrgCapabilities("leaf_manager");
    expect(leaf.dashboardVariant).toBe("team_manager");
    expect(leaf.performanceVariant).toBe("direct_team");
    expect(leaf.canViewTeamOperationalTables).toBe(true);
  });
});
