import type { LeadershipBranch } from "./leadershipBranchTypes";
import type { OrganizationOverviewModel } from "./organizationTypes";
import type { BranchCapacitySummary } from "./leadershipBranchTypes";

export interface BranchCapacityPart {
  label: string;
  value: number;
}

export interface LeadershipBranchPerformanceRow {
  leaderId: string;
  leaderName: string;
  leaderTitle?: string;
  peopleCount: number;
  performanceLabel: string;
  attentionLabel: string;
  deliveryRiskCount: number;
  capacityLabel: string;
  capacityParts: BranchCapacityPart[];
  capacityMeasuredLabel: string;
  availabilityLabel: string;
}

export function capacityParts(capacity: BranchCapacitySummary): BranchCapacityPart[] {
  return [
    { label: "Overloaded", value: capacity.overloaded },
    { label: "Heavy", value: capacity.heavy },
    { label: "Balanced", value: capacity.balanced },
    { label: "Light", value: capacity.light },
  ].filter((part) => part.value > 0);
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
    const cap = branch.metrics.capacity;
    const parts = capacityParts(cap);
    const capacityLabel = parts.length
      ? parts.map((part) => `${part.value} ${part.label}`).join(" · ")
      : "—";

    return {
      leaderId: branch.leaderId,
      leaderName: branch.leaderName,
      leaderTitle: branch.leaderTitle,
      peopleCount: branch.totalPeopleCount,
      performanceLabel: `${branch.metrics.throughputCount} completed · ${branch.metrics.firstPassPercent}% first pass`,
      attentionLabel: formatAttention(branch),
      deliveryRiskCount: branch.metrics.uniqueDeliveryRiskCount,
      capacityLabel,
      capacityParts: parts,
      capacityMeasuredLabel:
        cap.totalPeople > 0 ? `${cap.measuredPeople}/${cap.totalPeople} measured` : "—",
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
