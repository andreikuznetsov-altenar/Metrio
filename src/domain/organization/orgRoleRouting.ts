import type { OrgRole } from "./orgRole";
import type { HomeRoleVariant } from "../home/homeTypes";

export type DashboardVariant = "employee" | "team_manager" | "leadership";

export type PerformanceVariant = "self" | "direct_team" | "leadership_branches";

export function resolveDashboardVariant(
  orgRole: OrgRole | "unresolved" | undefined,
): DashboardVariant {
  if (orgRole === "manager_of_managers") return "leadership";
  if (orgRole === "leaf_manager") return "team_manager";
  return "employee";
}

export function resolvePerformanceVariant(
  orgRole: OrgRole | "unresolved" | undefined,
): PerformanceVariant {
  if (orgRole === "manager_of_managers") return "leadership_branches";
  if (orgRole === "leaf_manager") return "direct_team";
  return "self";
}

export function homeRoleVariantFromOrgRole(
  orgRole: OrgRole | "unresolved" | undefined,
): HomeRoleVariant {
  if (orgRole === "manager_of_managers") return "director";
  if (orgRole === "leaf_manager") return "manager";
  return "employee";
}

export function recommendationRoleFromOrgRole(
  orgRole: OrgRole | "unresolved" | undefined,
): HomeRoleVariant {
  return homeRoleVariantFromOrgRole(orgRole);
}
