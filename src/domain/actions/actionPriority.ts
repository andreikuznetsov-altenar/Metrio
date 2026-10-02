import type { ActionItem } from "./actionTypes";

const PRIORITY: Record<ActionItem["kind"], number> = {
  leave_delivery_risk: 0,
  review_bottleneck: 1,
  task_attention: 2,
  upcoming_leave: 3,
  workload: 4,
  feedback_pending: 5,
  knowledge: 6,
  knowledge_gap: 7,
};

const SEVERITY: Record<ActionItem["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function sortActionsByPriority(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    const pk = PRIORITY[a.kind] - PRIORITY[b.kind];
    if (pk !== 0) return pk;
    return SEVERITY[a.severity] - SEVERITY[b.severity];
  });
}
