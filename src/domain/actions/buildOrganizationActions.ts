import type { TeamPerformanceSnapshot } from "../performance";
import type { ActionItem } from "./actionTypes";
import { buildTeamActions } from "./buildTeamActions";
import { dedupeActions } from "./dedupeActions";
import { sortActionsByPriority } from "./actionPriority";

const MAX_ORG = 5;

/** Director scope stays identical to manager team scope until broader access is approved. */
export function buildOrganizationActions(input: {
  snapshot: TeamPerformanceSnapshot;
  deliveryRiskCount: number;
  overloadedCount: number;
}): ActionItem[] {
  const items: ActionItem[] = [];

  if (input.overloadedCount >= 2) {
    items.push({
      id: "org-workload-concentration",
      kind: "workload",
      severity: "warning",
      title: `${input.overloadedCount} people are overloaded`,
      count: input.overloadedCount,
      target: { kind: "performance", view: "people" },
      source: "jira",
    });
  }

  if (input.deliveryRiskCount >= 3) {
    items.push({
      id: "org-delivery-risk",
      kind: "review_bottleneck",
      severity: "warning",
      title: `${input.deliveryRiskCount} tasks flagged in delivery risk`,
      count: input.deliveryRiskCount,
      target: { kind: "performance", view: "delivery-risk" },
      source: "jira",
    });
  }

  const upcomingLeave = input.snapshot.timeOff.filter((t) => t.startDate).length;
  if (upcomingLeave >= 3) {
    items.push({
      id: "org-leave-concentration",
      kind: "upcoming_leave",
      severity: "info",
      title: `${upcomingLeave} upcoming leave events in the next two weeks`,
      count: upcomingLeave,
      target: { kind: "performance", view: "overview" },
      source: "bamboo",
    });
  }

  return sortActionsByPriority(dedupeActions(items)).slice(0, MAX_ORG);
}

export function buildDirectorTeamActions(
  input: Parameters<typeof buildTeamActions>[0],
): ActionItem[] {
  const team = buildTeamActions(input);
  const org = buildOrganizationActions({
    snapshot: input.snapshot,
    deliveryRiskCount: input.deliveryRisk.length,
    overloadedCount: input.snapshot.workload.filter((w) => w.workload === "Overloaded")
      .length,
  });
  return sortActionsByPriority(dedupeActions([...team, ...org])).slice(0, 7);
}
