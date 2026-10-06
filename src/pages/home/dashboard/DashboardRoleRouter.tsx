import type { DashboardVariant } from "../../../domain/organization/orgRoleRouting";

export interface DashboardRoleRouterProps {
  variant: DashboardVariant;
  leadership: React.ReactNode | null;
  teamManager: React.ReactNode | null;
  employee: React.ReactNode;
}

export function DashboardRoleRouter({
  variant,
  leadership,
  teamManager,
  employee,
}: DashboardRoleRouterProps) {
  if (variant === "leadership" && leadership) {
    return <>{leadership}</>;
  }
  if (variant === "team_manager" && teamManager) {
    return <>{teamManager}</>;
  }
  return <>{employee}</>;
}
