import type { OrgRole } from "./orgRole";

export interface OrgFeatureAccess {
  canManageSurveys: boolean;
  canViewSurveyManagement: boolean;
  canViewOwnFeedbackResults: boolean;
  usesDirectTeamView: boolean;
  usesLeadershipBranchView: boolean;
  usesSelfView: boolean;
  canViewManagerContact: boolean;
  canViewLeadershipBranches: boolean;
  canViewTeamOperationalTables: boolean;
  showFeedbackTab: boolean;
}

export function resolveOrgFeatureAccess(
  role: OrgRole | "unresolved",
): OrgFeatureAccess {
  if (role === "individual_contributor") {
    return {
      canManageSurveys: false,
      canViewSurveyManagement: false,
      canViewOwnFeedbackResults: true,
      usesDirectTeamView: false,
      usesLeadershipBranchView: false,
      usesSelfView: true,
      canViewManagerContact: true,
      canViewLeadershipBranches: false,
      canViewTeamOperationalTables: false,
      showFeedbackTab: true,
    };
  }

  if (role === "leaf_manager") {
    return {
      canManageSurveys: true,
      canViewSurveyManagement: true,
      canViewOwnFeedbackResults: true,
      usesDirectTeamView: true,
      usesLeadershipBranchView: false,
      usesSelfView: false,
      canViewManagerContact: false,
      canViewLeadershipBranches: false,
      canViewTeamOperationalTables: true,
      showFeedbackTab: true,
    };
  }

  if (role === "manager_of_managers") {
    return {
      canManageSurveys: false,
      canViewSurveyManagement: false,
      canViewOwnFeedbackResults: false,
      usesDirectTeamView: false,
      usesLeadershipBranchView: true,
      usesSelfView: false,
      canViewManagerContact: false,
      canViewLeadershipBranches: true,
      canViewTeamOperationalTables: false,
      showFeedbackTab: false,
    };
  }

  return {
    canManageSurveys: false,
    canViewSurveyManagement: false,
    canViewOwnFeedbackResults: true,
    usesDirectTeamView: false,
    usesLeadershipBranchView: false,
    usesSelfView: true,
    canViewManagerContact: true,
    canViewLeadershipBranches: false,
    canViewTeamOperationalTables: false,
    showFeedbackTab: false,
  };
}
