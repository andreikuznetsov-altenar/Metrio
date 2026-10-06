import type { PerformanceVariant } from "../../domain/organization/orgRoleRouting";

export interface PerformanceRoleRouterProps {
  variant: PerformanceVariant;
  self: React.ReactNode;
  directTeam: React.ReactNode;
  leadershipBranches: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PerformanceRoleRouter({
  variant,
  self,
  directTeam,
  leadershipBranches,
  fallback,
}: PerformanceRoleRouterProps) {
  if (variant === "leadership_branches") {
    return <>{leadershipBranches}</>;
  }
  if (variant === "direct_team") {
    return <>{directTeam}</>;
  }
  if (variant === "self") {
    return <>{self}</>;
  }
  return <>{fallback ?? self}</>;
}
