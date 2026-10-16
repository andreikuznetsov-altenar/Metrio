/**
 * Rules shared by every recommendation surface (Dashboard Recommended Actions, Performance
 * recommendations, leadership recommendations) so one business definition exists per condition.
 */
import type { ActionItem } from "../actions/actionTypes";
import type { WorkloadRow } from "../performance";

/** Upcoming-leave actions exactly as the team-action builder derives them (one per person/leave). */
export function leaveActionItems(...lists: ActionItem[][]): ActionItem[] {
  const seen = new Set<string>();
  const out: ActionItem[] = [];
  for (const item of lists.flat()) {
    if (item.kind !== "leave_delivery_risk" && item.kind !== "upcoming_leave") continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * Team members whose CURRENT workload is Heavy or Overloaded. Completed-work history never gates
 * this: someone with a full queue and no finished tasks yet is still overloaded.
 */
export function elevatedCapacityRows(rows: WorkloadRow[]): WorkloadRow[] {
  return rows.filter((row) => row.workload === "Heavy" || row.workload === "Overloaded");
}
