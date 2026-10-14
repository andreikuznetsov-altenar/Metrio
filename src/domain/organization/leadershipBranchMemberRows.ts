import { getEfficiencyStatus } from "../jira/kpi";
import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";
import { buildBranchCapacitySummary } from "./leadershipBranchAggregation";
import { capacityParts, type BranchCapacityPart } from "./leadershipBranchPerformanceRows";

export interface LeadershipBranchMemberRow {
  personId: string;
  displayName: string;
  jobTitle?: string;
  performanceLabel: string;
  attentionLabel: string;
  deliveryRiskCount: number;
  capacityParts: BranchCapacityPart[];
  availabilityLabel: string;
}

/** Team members (everyone below the branch leader) for the expandable Teams table. */
export function buildLeadershipBranchMemberRows(input: {
  leaderId: string;
  descendantIds: string[];
  persons: Person[];
  deliveryRisk: DeliveryRiskItem[];
}): LeadershipBranchMemberRow[] {
  const byId = new Map(input.persons.map((person) => [person.id, person]));
  return input.descendantIds
    .filter((id) => id !== input.leaderId)
    .map((id) => byId.get(id))
    .filter((person): person is Person => Boolean(person))
    .map((person) => {
      const risks = input.deliveryRisk.filter((item) => item.personId === person.id);
      const critical = risks.filter((item) => item.severity === "critical").length;
      const watch = risks.length - critical;
      const attention = [
        critical > 0 ? `${critical} critical` : "",
        watch > 0 ? `${watch} watch` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      const perf = person.performance;
      const completed = perf?.completedCount ?? 0;
      const firstPass =
        perf && completed > 0
          ? Math.round((perf.firstPassAcceptedCount / completed) * 100)
          : null;
      const availability = person.availability;
      return {
        personId: person.id,
        displayName: person.bamboo.displayName,
        jobTitle: person.bamboo.jobTitle,
        performanceLabel:
          perf && firstPass !== null
            ? `${getEfficiencyStatus(perf.efficiencyIndex)} · ${firstPass}% first pass`
            : "—",
        attentionLabel: attention || "—",
        deliveryRiskCount: risks.length,
        capacityParts: capacityParts(buildBranchCapacitySummary([person])),
        availabilityLabel:
          availability.state === "available" ? "—" : availability.label || "—",
      };
    });
}
