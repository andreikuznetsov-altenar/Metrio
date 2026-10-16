import type { ReportParams } from "../jira/types";
import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";
import {
  aggregateLeadershipBranchMetrics,
  buildBranchCapacitySummary,
} from "./leadershipBranchAggregation";
import { capacityParts, type BranchCapacityPart } from "./leadershipBranchPerformanceRows";

export interface LeadershipBranchMemberRow {
  personId: string;
  displayName: string;
  jobTitle?: string;
  /** "Team member" for contributors, "N people" for a sub-lead's own team. */
  scopeLabel: string;
  performanceLabel: string;
  attentionLabel: string;
  deliveryRiskCount: number;
  capacityParts: BranchCapacityPart[];
  availabilityLabel: string;
  /** Next hierarchy level below this person (sub-leads only). */
  children: LeadershipBranchMemberRow[];
}

function attentionLabel(critical: number, watch: number): string {
  return [critical > 0 ? `${critical} critical` : "", watch > 0 ? `${watch} watch` : ""]
    .filter(Boolean)
    .join(" · ") || "—";
}

/**
 * The hierarchy below a branch leader, one level at a time: a Manager's row expands to their
 * Team Leads, and each Team Lead expands to their team members. Contributors carry their own
 * KPIs; sub-leads show their whole team aggregated with the same canonical branch aggregation.
 */
export function buildLeadershipBranchMemberRows(input: {
  leaderId: string;
  descendantIds: string[];
  persons: Person[];
  deliveryRisk: DeliveryRiskItem[];
  params: ReportParams;
}): LeadershipBranchMemberRow[] {
  const inScope = new Set(input.descendantIds);
  const byId = new Map(input.persons.map((person) => [person.id, person]));
  // A member whose supervisor link is missing or points outside the scoped people attaches
  // directly to the branch leader, so a gap in Bamboo data never hides someone from the table.
  const resolvable = new Set(input.persons.map((person) => person.id));
  const childrenOf = (parentId: string): Person[] =>
    input.persons.filter((person) => {
      if (person.id === parentId || !inScope.has(person.id)) return false;
      const supervisor = person.bamboo.supervisorId;
      if (supervisor === parentId) return true;
      const orphan = !supervisor || !resolvable.has(supervisor) || !inScope.has(supervisor);
      return parentId === input.leaderId && orphan && person.id !== input.leaderId;
    });
  const subtreeIds = (id: string): string[] => [
    id,
    ...childrenOf(id).flatMap((child) => subtreeIds(child.id)),
  ];

  const buildRow = (person: Person): LeadershipBranchMemberRow => {
    const kids = childrenOf(person.id);
    const availability = person.availability;
    const availabilityLabel =
      availability.state === "available" ? "—" : availability.label || "—";
    if (kids.length > 0) {
      const ids = subtreeIds(person.id);
      const metrics = aggregateLeadershipBranchMetrics({
        descendantIds: ids,
        persons: input.persons,
        deliveryRisk: input.deliveryRisk,
        params: input.params,
      });
      const away: string[] = [];
      if (metrics.awayNow > 0) away.push(`${metrics.awayNow} away`);
      if (metrics.awaySoon > 0) away.push(`${metrics.awaySoon} away soon`);
      return {
        personId: person.id,
        displayName: person.bamboo.displayName,
        jobTitle: person.bamboo.jobTitle,
        scopeLabel: `${ids.length} people`,
        performanceLabel: `${metrics.throughputCount} completed · ${metrics.firstPassPercent}% first pass`,
        attentionLabel: attentionLabel(metrics.attentionCritical, metrics.attentionWatch),
        deliveryRiskCount: metrics.uniqueDeliveryRiskCount,
        capacityParts: capacityParts(metrics.capacity),
        availabilityLabel: away.length ? away.join(" · ") : "—",
        children: kids.map(buildRow),
      };
    }
    const risks = input.deliveryRisk.filter((item) => item.personId === person.id);
    const critical = risks.filter((item) => item.severity === "critical").length;
    const perf = person.performance;
    const completed = perf?.completedCount ?? 0;
    const firstPass =
      perf && completed > 0
        ? Math.round((perf.firstPassAcceptedCount / completed) * 100)
        : null;
    return {
      personId: person.id,
      displayName: person.bamboo.displayName,
      jobTitle: person.bamboo.jobTitle,
      scopeLabel: "Team member",
      performanceLabel:
        perf && firstPass !== null
          ? `${perf.throughputCount ?? perf.completedCount} completed · ${firstPass}% first pass`
          : "—",
      attentionLabel: attentionLabel(critical, risks.length - critical),
      deliveryRiskCount: risks.length,
      capacityParts: capacityParts(buildBranchCapacitySummary([person])),
      availabilityLabel,
      children: [],
    };
  };

  void byId;
  return childrenOf(input.leaderId).map(buildRow);
}
