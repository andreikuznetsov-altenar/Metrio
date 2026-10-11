import { describe, expect, it } from "vitest";
import {
  canUseFeedbackForOrgHierarchy,
  resolveOrgFeatureAccess,
} from "./orgFeatureAccess";
import type { OrgHierarchyScope } from "./orgRole";

describe("resolveOrgFeatureAccess", () => {
  it("individual contributor hides survey management", () => {
    const access = resolveOrgFeatureAccess("individual_contributor");
    expect(access.canManageSurveys).toBe(false);
    expect(access.canViewSurveyManagement).toBe(false);
    expect(access.showFeedbackTab).toBe(false);
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

  it("allows Feedback only for leaf managers with direct IC reports", () => {
    const base: OrgHierarchyScope = {
      currentUserId: "current",
      role: "leaf_manager",
      directReportIds: ["ic-1"],
      directManagerReportIds: [],
      directIndividualContributorIds: ["ic-1"],
      descendantIds: ["current", "ic-1"],
      topLevelManagerBranches: [],
      maxDepthBelow: 1,
      graphWarnings: [],
    };

    expect(canUseFeedbackForOrgHierarchy(base)).toBe(true);
    expect(
      canUseFeedbackForOrgHierarchy({
        ...base,
        role: "individual_contributor",
        directReportIds: [],
        directIndividualContributorIds: [],
      }),
    ).toBe(false);
    expect(
      canUseFeedbackForOrgHierarchy({
        ...base,
        role: "manager_of_managers",
        directManagerReportIds: ["lead-1"],
        directIndividualContributorIds: [],
      }),
    ).toBe(false);
  });
});
