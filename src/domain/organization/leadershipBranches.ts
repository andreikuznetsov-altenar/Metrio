import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";
import type { TopLevelManagerBranch } from "./orgRole";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import type { OrganizationTeamRow } from "./organizationTypes";
import { formatDuration } from "../jira/dates";
import { getEfficiencyStatus } from "../jira/kpi";
import type { KpiData } from "../jira/types";

export interface LeadershipBranchGroup {
  branchId: string;
  leaderId: string;
  leaderName: string;
  leaderTitle?: string;
  persons: Person[];
}

function aggregateKpiFromPersons(persons: Person[]): KpiData {
  const totals = {
    startedCount: 0,
    completedCount: 0,
    firstPassAcceptedCount: 0,
    backflowCount: 0,
    avgProgressToReviewMs: null as number | null,
    efficiencyIndex: 0,
  };
  const cycleSamples: number[] = [];

  for (const person of persons) {
    const kpi = person.performance;
    if (!kpi) continue;
    totals.startedCount += kpi.startedCount;
    totals.completedCount += kpi.completedCount;
    totals.firstPassAcceptedCount += kpi.firstPassAcceptedCount;
    totals.backflowCount += kpi.backflowCount;
    if (kpi.avgProgressToReviewMs != null) {
      cycleSamples.push(kpi.avgProgressToReviewMs);
    }
  }

  if (cycleSamples.length) {
    totals.avgProgressToReviewMs = Math.round(
      cycleSamples.reduce((a, b) => a + b, 0) / cycleSamples.length,
    );
  }

  const completionRate =
    totals.startedCount > 0 ? totals.completedCount / totals.startedCount : 0;
  const firstPassRate =
    totals.completedCount > 0
      ? totals.firstPassAcceptedCount / totals.completedCount
      : 0;
  totals.efficiencyIndex = Math.round(
    (completionRate * 0.4 + firstPassRate * 0.4) * 100 -
      Math.min(totals.backflowCount * 3, 20),
  );

  return totals as KpiData;
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
): OrganizationTeamRow {
  const kpi = aggregateKpiFromPersons(group.persons);
  const firstPassPercent =
    kpi.completedCount > 0
      ? Math.round((kpi.firstPassAcceptedCount / kpi.completedCount) * 100)
      : 0;
  const branchRisk = deliveryRisk.filter((item) =>
    group.persons.some((person) => person.id === item.personId),
  );
  const attentionSeverity = branchRisk.some((r) => r.severity === "critical")
    ? 0
    : branchRisk.some((r) => r.severity === "warning")
      ? 1
      : 2;
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
    attentionCount: branchRisk.length,
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

export { getEfficiencyStatus };
