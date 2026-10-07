import { resolveHomeRoleVariant } from "../domain/home/buildHomeWorkspace";
import { buildTraySummaryFromPerformance } from "../domain/tray/buildTraySummaryFromPerformance";
import type { TrayBuildContext } from "./trayActionCenter";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import type { PerformanceViewModels } from "../services/performance/performanceViewModel";
import type { CurrentUser } from "../domain/types";
import { countUnreadNotificationEvents } from "./notificationEvents";

export function buildTrayContextFromPerformance(
  result: PerformanceFetchResult,
  options: {
    selfPersonId: string;
    currentUser: CurrentUser | null | undefined;
    viewModels: PerformanceViewModels | null | undefined;
  },
): TrayBuildContext {
  const self =
    result.teamSnapshot.persons.find((person) => person.id === options.selfPersonId) ??
    result.teamSnapshot.persons[0];
  const homeRole = resolveHomeRoleVariant(
    options.currentUser?.person.role ?? "employee",
    null,
    options.currentUser?.orgRole,
  );
  const teamOverview = options.viewModels?.teamOverview ?? null;
  const teamSecondary = options.viewModels?.teamSecondary;
  const employee = options.viewModels?.employee;
  const deliveryRisk = teamSecondary?.deliveryRisk ?? [];
  const deliveryRiskCount = deliveryRisk.length;
  const teamWorkload = teamOverview?.workload ?? [];
  const activeValue =
    employee?.myWeek.summary.find((metric) => metric.label === "Active")?.value ?? "0";

  const summary = buildTraySummaryFromPerformance(
    {
      homeRole,
      teamSnapshot: teamOverview,
      employeeActiveSummaryValue: activeValue,
      deliveryRisk,
      scopeHealthEvidence: {
        role: homeRole,
        focusCount: 0,
        deliveryRiskCount,
        deliverySummary: undefined,
        teamWorkload,
        teamsNeedingAttention: 0,
        organizationSignalCount: 0,
        selfWorkload: self?.workload ?? null,
      },
    },
    countUnreadNotificationEvents(),
  );

  return { summary };
}
