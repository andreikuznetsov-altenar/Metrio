import type { DeliveryRiskRow, TeamPerformanceSnapshot } from "../performance";
import type { ScopeHealthSummary } from "../home/executiveDashboardModel";
import { buildScopeHealthSummary } from "../home/executiveDashboardModel";
import type { HomeRoleVariant } from "../home/homeTypes";
import { parseActiveJiraCount } from "../home/dashboardContextSummary";
import {
  buildTraySummaryModel,
  dedupeIssueKeys,
  indexLabelForRole,
  sumOpenTasks,
  type TraySummaryModel,
  type TraySummaryRole,
} from "./buildTraySummaryModel";

export interface TrayPerformanceSummaryInput {
  homeRole: HomeRoleVariant;
  teamSnapshot: TeamPerformanceSnapshot | null;
  employeeActiveSummaryValue?: string;
  deliveryRisk: DeliveryRiskRow[];
  scopeHealthEvidence: Parameters<typeof buildScopeHealthSummary>[1];
}

function trayRoleFromHome(homeRole: HomeRoleVariant): TraySummaryRole {
  if (homeRole === "employee") return "employee";
  if (homeRole === "director") return "director";
  return "manager";
}

export function countScopedProblemTasks(deliveryRisk: DeliveryRiskRow[]): number {
  return dedupeIssueKeys(deliveryRisk.map((row) => row.issueKey)).length;
}

export function countScopedOpenTasks(input: TrayPerformanceSummaryInput): number {
  const role = trayRoleFromHome(input.homeRole);
  if (role === "employee") {
    return parseActiveJiraCount(input.employeeActiveSummaryValue ?? "0");
  }
  const workload = input.teamSnapshot?.workload ?? [];
  return sumOpenTasks(workload.map((row) => row.activeWork));
}

export function scopeHealthForTray(input: TrayPerformanceSummaryInput): ScopeHealthSummary {
  return buildScopeHealthSummary(input.homeRole, input.scopeHealthEvidence);
}

export function buildTraySummaryFromPerformance(
  input: TrayPerformanceSummaryInput,
  unreadNotificationCount: number,
): TraySummaryModel {
  const role = trayRoleFromHome(input.homeRole);
  const scopeHealth = scopeHealthForTray(input);
  const indexValue = scopeHealth.line.split("·")[0]?.trim() || "—";

  return buildTraySummaryModel({
    role,
    openTaskCount: countScopedOpenTasks(input),
    problemTaskCount: countScopedProblemTasks(input.deliveryRisk),
    indexLabel: indexLabelForRole(role),
    indexValue,
    indexAvailable: true,
    unreadNotificationCount,
  });
}
