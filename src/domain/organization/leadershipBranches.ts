import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";
import type { TopLevelManagerBranch } from "./orgRole";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import type { OrganizationTeamRow } from "./organizationTypes";
import { formatDuration } from "../jira/dates";
import type { ReportParams } from "../jira/types";
import { buildCanonicalKpiForPersonScope } from "../jira/scopedCanonicalKpi";
import {
  buildBranchCapacitySummary,
  formatBranchCapacitySummaryLabel,
} from "./leadershipBranchAggregation";

export interface LeadershipBranchGroup {
  branchId: string;
  leaderId: string;
  leaderName: string;
  leaderTitle?: string;
  persons: Person[];
}

export function groupPersonsByLeadershipBranch(input: {
  branches: TopLevelManagerBranch[];
  roster: ResolvedEmployee[];
  snapshotPersons: Person[];
}): LeadershipBranchGroup[] {
  const rosterById = new Map(input.roster.map((p) => [p.id, p]));
  const personById = new Map(input.snapshotPersons.map((p) => [p.id, p]));

  return input.branches.map((branch) => {
    const leader = rosterById.get(branch.managerId);
    const persons = branch.descendantIds
      .map((id) => personById.get(id))
      .filter((p): p is Person => Boolean(p));
    return {
      branchId: branch.managerId,
      leaderId: branch.managerId,
      leaderName:
        leader?.displayName ??
        persons[0]?.bamboo.displayName ??
        persons[0]?.bamboo.firstName ??
        "Branch",
      leaderTitle: leader?.jobTitle,
      persons,
    };
  });
}

export function buildLeadershipBranchRow(
  group: LeadershipBranchGroup,
  deliveryRisk: DeliveryRiskItem[],
  params: ReportParams,
): OrganizationTeamRow {
  const kpi = buildCanonicalKpiForPersonScope({
    persons: group.persons,
    params,
  });
  const firstPassPercent =
    kpi.completedCount > 0
      ? Math.round((kpi.firstPassAcceptedCount / kpi.completedCount) * 100)
      : 0;
  const branchRisk = deliveryRisk.filter((item) =>
    group.persons.some((person) => person.id === item.personId),
  );
  const uniqueAttentionCount = countUniqueDeliveryRiskForBranch(group, deliveryRisk);
  const attentionSeverity = branchRisk.some((r) => r.severity === "critical")
    ? 0
    : branchRisk.some((r) => r.severity === "warning")
      ? 1
      : 2;
  const capacity = buildBranchCapacitySummary(group.persons);
  const upcomingLeave = group.persons.filter(
    (p) =>
      p.availability.state === "vacation_soon" ||
      p.availability.state === "vacation_tomorrow",
  ).length;
  const activeWork = group.persons.reduce(
    (sum, person) => sum + (person.workload?.activeCount ?? 0),
    0,
  );

  return {
    teamId: group.branchId,
    teamName: group.leaderName,
    peopleCount: group.persons.length,
    activeWork,
    attentionCount: uniqueAttentionCount,
    deliveryRiskCount: uniqueAttentionCount,
    capacitySummaryLabel: formatBranchCapacitySummaryLabel(capacity),
    completed: kpi.completedCount,
    firstPassPercent,
    avgCycleLabel: kpi.avgProgressToReviewMs
      ? formatDuration(kpi.avgProgressToReviewMs)
      : "—",
    upcomingLeave,
    attentionSeverity,
  };
}

export function dedupeIssueKeys(keys: string[]): string[] {
  return [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
}

export function countUniqueDeliveryRiskForBranch(
  group: LeadershipBranchGroup,
  deliveryRisk: DeliveryRiskItem[],
): number {
  const personIds = new Set(group.persons.map((p) => p.id));
  const keys = deliveryRisk
    .filter((item) => personIds.has(item.personId))
    .map((item) => item.issueKey);
  return dedupeIssueKeys(keys).length;
}

