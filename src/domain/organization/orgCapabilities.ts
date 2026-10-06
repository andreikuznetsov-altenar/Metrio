import type { OrgRole } from "./orgRole";
import { resolveOrgFeatureAccess, type OrgFeatureAccess } from "./orgFeatureAccess";
import {
  resolveDashboardVariant,
  resolvePerformanceVariant,
  type DashboardVariant,
  type PerformanceVariant,
} from "./orgRoleRouting";

export interface OrgCapabilities extends OrgFeatureAccess {
  orgRole: OrgRole | "unresolved";
  dashboardVariant: DashboardVariant;
  performanceVariant: PerformanceVariant;
}

export function resolveOrgCapabilities(
  orgRole: OrgRole | "unresolved" | undefined,
): OrgCapabilities {
  const role = orgRole ?? "unresolved";
  const access = resolveOrgFeatureAccess(role);
  return {
    ...access,
    orgRole: role,
    dashboardVariant: resolveDashboardVariant(role),
    performanceVariant: resolvePerformanceVariant(role),
  };
}
