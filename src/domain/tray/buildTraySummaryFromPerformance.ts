import type { DeliveryRiskRow, MetricCardData, TeamPerformanceSnapshot } from "../performance";
import type { ScopeHealthSummary } from "../home/executiveDashboardModel";
import { canonicalTeamThroughputValue } from "../home/buildDashboardKpis";
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
  /** Person-level metric cards (same source as IC Dashboard / Performance Throughput). */
  employeeMetrics?: readonly MetricCardData[] | null;
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

const NUMERIC_OUTCOME = /^\d+(?:\.\d+)?$/;

/** Tray throughput is a raw completion count; anything else renders as an em dash. */
function numericIndexOrDash(value: string): string {
  return NUMERIC_OUTCOME.test(value.trim()) ? value.trim() : "—";
}

function trayIndexValue(input: TrayPerformanceSummaryInput): string {
  const summary =
    trayRoleFromHome(input.homeRole) === "employee"
      ? (input.employeeMetrics ?? input.teamSnapshot?.summary ?? [])
      : (input.teamSnapshot?.summary ?? []);
  return numericIndexOrDash(canonicalTeamThroughputValue(summary));
}

export function buildTraySummaryFromPerformance(
  input: TrayPerformanceSummaryInput,
  unreadNotificationCount: number,
): TraySummaryModel {
  const role = trayRoleFromHome(input.homeRole);
  const indexValue = trayIndexValue(input);

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
