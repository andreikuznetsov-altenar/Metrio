import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";
import type { ReportParams } from "../jira/types";
import { buildCanonicalKpiForPersonScope } from "../jira/scopedCanonicalKpi";
import type { TopLevelManagerBranch } from "./orgRole";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import {
  capacityDataStateFromWorkload,
  capacityPresentationLabel,
  isMeasuredCapacityLabel,
} from "../workload/capacityPresentation";
import type {
  BranchCapacitySummary,
  LeadershipBranch,
  LeadershipBranchMetrics,
} from "./leadershipBranchTypes";
import { dedupeIssueKeys } from "./leadershipBranches";

export function buildBranchCapacitySummary(persons: Person[]): BranchCapacitySummary {
  const seen = new Set<string>();
  const summary: BranchCapacitySummary = {
    totalPeople: 0,
    measuredPeople: 0,
    insufficientHistoryPeople: 0,
    light: 0,
    balanced: 0,
    heavy: 0,
    overloaded: 0,
  };

  for (const person of persons) {
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    summary.totalPeople += 1;

    const wl = person.workload ?? null;
    const state = capacityDataStateFromWorkload(wl);
    if (state === "insufficient_history") {
      summary.insufficientHistoryPeople += 1;
      continue;
    }

    const label = capacityPresentationLabel(wl, person.availability);
    if (!isMeasuredCapacityLabel(label)) {
      summary.insufficientHistoryPeople += 1;
      continue;
    }

    summary.measuredPeople += 1;
    switch (label) {
      case "Light":
        summary.light += 1;
        break;
      case "Balanced":
        summary.balanced += 1;
        break;
      case "Heavy":
        summary.heavy += 1;
        break;
      case "Overloaded":
        summary.overloaded += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

export function formatBranchCapacitySummaryLabel(capacity: BranchCapacitySummary): string {
  const parts: string[] = [];
  if (capacity.heavy > 0) parts.push(`${capacity.heavy} Heavy`);
  if (capacity.overloaded > 0) parts.push(`${capacity.overloaded} Overloaded`);
  if (capacity.balanced > 0) parts.push(`${capacity.balanced} Balanced`);
  if (capacity.light > 0) parts.push(`${capacity.light} Light`);
  if (capacity.insufficientHistoryPeople > 0) {
    parts.push(`${capacity.insufficientHistoryPeople} no history`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

function branchDeliveryRiskItems(
  personIds: Set<string>,
  deliveryRisk: DeliveryRiskItem[],
): DeliveryRiskItem[] {
  const byKey = new Map<string, DeliveryRiskItem>();
  for (const item of deliveryRisk) {
    if (!personIds.has(item.personId)) continue;
    const key = item.issueKey.trim();
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || item.severity === "critical") {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

export function aggregateLeadershipBranchMetrics(input: {
  descendantIds: string[];
  persons: Person[];
  deliveryRisk: DeliveryRiskItem[];
  /** Required for canonical Efficiency (same params as Performance team KPI). */
  params: ReportParams;
}): LeadershipBranchMetrics {
  const personById = new Map(input.persons.map((p) => [p.id, p]));
  const uniqueIds = [...new Set(input.descendantIds)];
  const branchPersons = uniqueIds
    .map((id) => personById.get(id))
    .filter((p): p is Person => Boolean(p));

  const personIds = new Set(uniqueIds);
  const branchRisk = branchDeliveryRiskItems(personIds, input.deliveryRisk);
  const kpi = buildCanonicalKpiForPersonScope({
    persons: branchPersons,
    params: input.params,
  });
  const firstPassPercent =
    kpi.completedCount > 0
      ? Math.round((kpi.firstPassAcceptedCount / kpi.completedCount) * 100)
      : 0;

  let attentionCritical = 0;
  let attentionWatch = 0;
  let longReviewCount = 0;
  let problematicCount = 0;
  for (const item of branchRisk) {
    if (item.severity === "critical") attentionCritical += 1;
    else if (item.severity === "warning") attentionWatch += 1;
    if (/^Review for \d+ day/i.test(item.reason)) longReviewCount += 1;
    if (/problematic|blocked|on hold/i.test(item.reason)) problematicCount += 1;
  }

  const activeWorkCount = branchPersons.reduce(
    (sum, person) => sum + (person.workload?.activeCount ?? 0),
    0,
  );

  let awayNow = 0;
  let awaySoon = 0;
  for (const person of branchPersons) {
    const state = person.availability.state;
    if (
      state === "on_vacation" ||
      state === "returns_today" ||
      person.availability.isHoliday
    ) {
      awayNow += 1;
    } else if (state === "vacation_soon" || state === "vacation_tomorrow") {
      awaySoon += 1;
    }
  }

  const capacity = buildBranchCapacitySummary(branchPersons);

  return {
    activeWorkCount,
    uniqueDeliveryRiskCount: dedupeIssueKeys(branchRisk.map((r) => r.issueKey)).length,
    longReviewCount,
    problematicCount,
    attentionCritical,
    attentionWatch,
    firstPassPercent,
    completedCount: kpi.completedCount,
    backflowCount: kpi.backflowCount,
    efficiencyIndex: kpi.efficiencyIndex,
    capacity,
    awayNow,
    awaySoon,
  };
}

export function buildLeadershipBranches(input: {
  branches: TopLevelManagerBranch[];
  roster: ResolvedEmployee[];
  persons: Person[];
  deliveryRisk: DeliveryRiskItem[];
  graph: Map<string, import("./orgGraph").OrgNode>;
  params: ReportParams;
}): LeadershipBranch[] {
  const rosterById = new Map(input.roster.map((p) => [p.id, p]));

  return input.branches.map((branch) => {
    const leader = rosterById.get(branch.managerId);
    const leaderNode = input.graph.get(branch.managerId);
    const memberIds = [...new Set([branch.managerId, ...branch.descendantIds])];
    const descendantIds = memberIds.filter((id) => id !== branch.managerId);
    const metrics = aggregateLeadershipBranchMetrics({
      descendantIds: memberIds,
      persons: input.persons,
      deliveryRisk: input.deliveryRisk,
      params: input.params,
    });

    return {
      leaderId: branch.managerId,
      leaderName: leader?.displayName ?? branch.managerId,
      leaderTitle: leader?.jobTitle,
      memberIds,
      descendantIds,
      directReportCount: leaderNode?.directReportIds.length ?? 0,
      totalPeopleCount: memberIds.length,
      metrics,
    };
  });
}
