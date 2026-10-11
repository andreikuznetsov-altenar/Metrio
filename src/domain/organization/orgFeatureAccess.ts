import type { OrgRole } from "./orgRole";
import type { CurrentUser } from "../types";
import type { OrgHierarchyScope } from "./orgRole";

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
      canViewOwnFeedbackResults: false,
      usesDirectTeamView: false,
      usesLeadershipBranchView: false,
      usesSelfView: true,
      canViewManagerContact: true,
      canViewLeadershipBranches: false,
      canViewTeamOperationalTables: false,
      showFeedbackTab: false,
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
    canViewOwnFeedbackResults: false,
    usesDirectTeamView: false,
    usesLeadershipBranchView: false,
    usesSelfView: true,
    canViewManagerContact: true,
    canViewLeadershipBranches: false,
    canViewTeamOperationalTables: false,
    showFeedbackTab: false,
  };
}

export function canUseFeedbackForOrgHierarchy(
  hierarchy?: OrgHierarchyScope | null,
): boolean {
  return Boolean(
    hierarchy?.role === "leaf_manager" &&
      hierarchy.directIndividualContributorIds.length > 0,
  );
}

export function canUseFeedback(currentUser: CurrentUser): boolean {
  return canUseFeedbackForOrgHierarchy(currentUser.orgHierarchy);
}

export function resolveOrgFeatureAccessForUser(
  currentUser: CurrentUser,
): OrgFeatureAccess {
  const access = resolveOrgFeatureAccess(currentUser.orgRole ?? "unresolved");
  const feedbackAllowed = canUseFeedback(currentUser);
  return {
    ...access,
    canManageSurveys: feedbackAllowed,
    canViewSurveyManagement: feedbackAllowed,
    canViewOwnFeedbackResults: feedbackAllowed,
    showFeedbackTab: feedbackAllowed,
  };
}
