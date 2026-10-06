import type { ActionItem, ActionTarget } from "../actions/actionTypes";
import type { ActionNavigationHandlers } from "../../app/actionNavigation";
import { navigateActionTarget } from "../../app/actionNavigation";

export const PERFORMANCE_SCROLL_TARGETS = {
  teamAttention: "performance-section-team-attention",
  teamWorkload: "performance-section-team-workload",
  upcomingAvailability: "performance-section-upcoming-availability",
  deliveryRisk: "delivery-risk-view",
  radar: "radar-view",
} as const;

export function resolveAttentionViewTarget(action: ActionItem): ActionTarget {
  if (action.target.kind === "delivery-risk") {
    return { kind: "performance", view: "delivery-risk" };
  }
  if (action.kind === "workload") {
    return { kind: "performance", view: "overview" };
  }
  if (action.kind === "task_attention" || action.kind === "review_bottleneck") {
    return { kind: "performance", view: "radar" };
  }
  if (action.kind === "leave_delivery_risk" || action.kind === "upcoming_leave") {
    return { kind: "performance", view: "overview" };
  }
  return action.target;
}

export function scrollTargetIdForAction(action: ActionItem): string | null {
  if (action.kind === "workload") {
    return PERFORMANCE_SCROLL_TARGETS.teamWorkload;
  }
  if (action.kind === "task_attention") {
    return PERFORMANCE_SCROLL_TARGETS.teamAttention;
  }
  if (action.kind === "review_bottleneck" || action.kind === "delivery_dependency") {
    return PERFORMANCE_SCROLL_TARGETS.deliveryRisk;
  }
  if (action.kind === "leave_delivery_risk" || action.kind === "upcoming_leave") {
    return PERFORMANCE_SCROLL_TARGETS.upcomingAvailability;
  }
  return null;
}

export function navigateAttentionItem(
  target: ActionTarget,
  handlers: ActionNavigationHandlers,
  scrollTargetId?: string | null,
): void {
  navigateActionTarget(target, handlers);
  if (!scrollTargetId) return;
  window.setTimeout(() => {
    document.getElementById(scrollTargetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 120);
}
