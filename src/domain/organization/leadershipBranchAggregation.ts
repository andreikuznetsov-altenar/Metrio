import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";
import type { ReportParams } from "../jira/types";
import { buildCanonicalKpiForPersonScope } from "../jira/scopedCanonicalKpi";
import type { TopLevelManagerBranch } from "./orgRole";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import {
  WORKLOAD_UNAVAILABLE_LABEL,
  capacityPresentationLabel,
  isMeasuredCapacityLabel,
} from "../workload/capacityPresentation";
import type {
  BranchCapacitySummary,
  LeadershipBranch,
  LeadershipBranchMetrics,
} from "./leadershipBranchTypes";
import { dedupeIssueKeys } from "./leadershipBranches";
import { dedupeDeliveryRiskByIssueKey } from "../radar/deliveryRisk";
import {
  aggregateCurrentEffort,
  currentWorkloadPercent,
  personalCurrentEffort,
} from "../workload/hierarchicalWorkload";
import { aggregateHistoricalLoad, capacityLevelFromPercent } from "../workflows/capacityWorkload";
import { workloadDisplayLabel } from "../workload/workloadDisplay";

export function buildBranchCapacitySummary(persons: Person[]): BranchCapacitySummary {
  const seen = new Set<string>();
  const summary: BranchCapacitySummary = {
    totalPeople: 0,
    measuredPeople: 0,
    unratedPeople: 0,
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
    if (!wl) {
      summary.unratedPeople += 1;
      continue;
    }

    // Current workload is available even when Historical load has no completed-cycle samples.
    // The current distribution is never gated on completed-work history.
    const label = capacityPresentationLabel(wl, person.availability);
    if (!isMeasuredCapacityLabel(label)) {
      summary.unratedPeople += 1;
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
  if (capacity.unratedPeople > 0) {
    parts.push(`${capacity.unratedPeople} unavailable`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

/** Delivery-risk items of the branch's people, one per Jira issue key (most severe wins). */
function branchDeliveryRiskItems(
  personIds: Set<string>,
  deliveryRisk: DeliveryRiskItem[],
): DeliveryRiskItem[] {
  return dedupeDeliveryRiskByIssueKey(
    deliveryRisk.filter((item) => personIds.has(item.personId)),
  );
}

export function aggregateLeadershipBranchMetrics(input: {
  descendantIds: string[];
  persons: Person[];
  deliveryRisk: DeliveryRiskItem[];
  /** Reporting period used by canonical cycle metrics. */
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
    // Structured Task Health fields — never parse the human-readable reason.
    if (
      item.stageKind === "review" &&
      (item.reasonCode === "stage_overdue" || item.reasonCode === "stage_attention")
    ) {
      longReviewCount += 1;
    }
    if (item.healthStatus === "problematic") problematicCount += 1;
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
  const effort = aggregateCurrentEffort(
    uniqueIds,
    (id) => personalCurrentEffort(personById.get(id)),
  );
  const currentPercent = currentWorkloadPercent(effort);
  const historical = aggregateHistoricalLoad(
    branchPersons
      .map((person) => person.workload?.capacityBreakdown)
      .filter((breakdown): breakdown is NonNullable<typeof breakdown> => Boolean(breakdown)),
  );

  return {
    activeWorkCount,
    uniqueDeliveryRiskCount: dedupeIssueKeys(branchRisk.map((r) => r.issueKey)).length,
    longReviewCount,
    problematicCount,
    attentionCritical,
    attentionWatch,
    firstPassPercent,
    completedCount: kpi.completedCount,
    backflowEventCount: kpi.backflowEventCount,
    reworkedCycleCount: kpi.reworkedCycleCount,
    throughputCount: kpi.throughputCount ?? kpi.completedCount,
    capacity,
    // Σ expected effort / Σ available hours (raw numerators and denominators, never averaged %).
    currentWorkload: {
      expectedEffortHours: effort ? Math.round(effort.expectedEffortHours * 10) / 10 : 0,
      availableHoursInHorizon: effort ? Math.round(effort.availableHoursInHorizon * 10) / 10 : 0,
      percent: currentPercent === null ? null : Math.round(currentPercent * 10) / 10,
      label:
        currentPercent === null
          ? WORKLOAD_UNAVAILABLE_LABEL
          : workloadDisplayLabel(capacityLevelFromPercent(currentPercent)),
    },
    // Historical load: Σ merged hands-on hours / Σ scheduled available hours.
    historicalLoad: {
      executionHoursInPeriod: Math.round(historical.executionHoursInPeriod * 10) / 10,
      availableHoursInPeriod: Math.round(historical.availableHoursInPeriod * 10) / 10,
      percent: historical.availableHoursInPeriod > 0 ? historical.capacityLoadPercent : null,
    },
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
