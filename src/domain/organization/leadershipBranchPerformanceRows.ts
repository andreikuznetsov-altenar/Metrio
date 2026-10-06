import { getEfficiencyStatus } from "../jira/kpi";
import type { LeadershipBranch } from "./leadershipBranchTypes";
import type { OrganizationOverviewModel } from "./organizationTypes";
import { formatBranchCapacitySummaryLabel } from "./leadershipBranchAggregation";

export interface LeadershipBranchPerformanceRow {
  leaderId: string;
  leaderName: string;
  leaderTitle?: string;
  peopleCount: number;
  performanceLabel: string;
  attentionLabel: string;
  deliveryRiskCount: number;
  capacityLabel: string;
  availabilityLabel: string;
}

function formatAttention(branch: LeadershipBranch): string {
  const m = branch.metrics;
  const parts: string[] = [];
  if (m.attentionCritical > 0) parts.push(`${m.attentionCritical} critical`);
  if (m.attentionWatch > 0) parts.push(`${m.attentionWatch} watch`);
  return parts.length ? parts.join(" · ") : "—";
}

function formatAvailability(branch: LeadershipBranch): string {
  const m = branch.metrics;
  const parts: string[] = [];
  if (m.awayNow > 0) parts.push(`${m.awayNow} away`);
  if (m.awaySoon > 0) parts.push(`${m.awaySoon} away soon`);
  return parts.length ? parts.join(" · ") : "—";
}

export function buildLeadershipBranchPerformanceRows(
  branches: LeadershipBranch[],
): LeadershipBranchPerformanceRow[] {
  return branches.map((branch) => {
    const status = getEfficiencyStatus(branch.metrics.efficiencyIndex);
    const cap = branch.metrics.capacity;
    const capacityCore = formatBranchCapacitySummaryLabel(cap);
    const capacityLabel =
      cap.totalPeople > 0
        ? `${capacityCore}${capacityCore !== "—" ? " · " : ""}${cap.measuredPeople}/${cap.totalPeople} measured`
        : capacityCore;

    return {
      leaderId: branch.leaderId,
      leaderName: branch.leaderName,
      leaderTitle: branch.leaderTitle,
      peopleCount: branch.totalPeopleCount,
      performanceLabel: `${status} · ${branch.metrics.firstPassPercent}% first pass`,
      attentionLabel: formatAttention(branch),
      deliveryRiskCount: branch.metrics.uniqueDeliveryRiskCount,
      capacityLabel: capacityLabel.replace(/ · $/, "") || "—",
      availabilityLabel: formatAvailability(branch),
    };
  });
}

export function branchMetricParityPairs(model: OrganizationOverviewModel): Array<{
  leaderId: string;
  teamPeopleCount: number;
  perfPeopleCount: number;
  teamAttention: number;
  perfDeliveryRisk: number;
}> {
  const branches = model.leadershipBranches ?? [];
  const perfRows = buildLeadershipBranchPerformanceRows(branches);
  return branches.map((branch) => {
    const teamRow = model.teams.find((t) => t.teamId === branch.leaderId);
    const perfRow = perfRows.find((r) => r.leaderId === branch.leaderId);
    return {
      leaderId: branch.leaderId,
      teamPeopleCount: teamRow?.peopleCount ?? 0,
      perfPeopleCount: perfRow?.peopleCount ?? 0,
      teamAttention: teamRow?.attentionCount ?? 0,
      perfDeliveryRisk: perfRow?.deliveryRiskCount ?? 0,
    };
  });
}
