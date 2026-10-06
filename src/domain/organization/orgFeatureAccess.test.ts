import { describe, expect, it } from "vitest";
import { resolveOrgFeatureAccess } from "./orgFeatureAccess";

describe("resolveOrgFeatureAccess", () => {
  it("individual contributor hides survey management", () => {
    const access = resolveOrgFeatureAccess("individual_contributor");
    expect(access.canManageSurveys).toBe(false);
    expect(access.canViewSurveyManagement).toBe(false);
    expect(access.canViewManagerContact).toBe(true);
    expect(access.usesSelfView).toBe(true);
  });

  it("leaf manager enables survey management", () => {
    const access = resolveOrgFeatureAccess("leaf_manager");
    expect(access.canManageSurveys).toBe(true);
    expect(access.canViewSurveyManagement).toBe(true);
    expect(access.usesDirectTeamView).toBe(true);
  });

  it("manager of managers hides survey operational UI and feedback tab", () => {
    const access = resolveOrgFeatureAccess("manager_of_managers");
    expect(access.canManageSurveys).toBe(false);
    expect(access.canViewSurveyManagement).toBe(false);
    expect(access.usesLeadershipBranchView).toBe(true);
    expect(access.showFeedbackTab).toBe(false);
  });
});
