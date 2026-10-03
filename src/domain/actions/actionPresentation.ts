import type { ActionItem, ActionKind } from "./actionTypes";

export function actionReasonTag(kind: ActionKind, description?: string): string {
  switch (kind) {
    case "workload":
      return "Overloaded";
    case "review_bottleneck":
      return "Long Review";
    case "upcoming_leave":
      return "Upcoming leave";
    case "leave_delivery_risk":
      return "Leave delivery risk";
    case "feedback_pending":
      return "Feedback pending";
    case "delivery_dependency":
      return "Delivery dependency";
    case "knowledge_gap":
      return "Knowledge gap";
    case "knowledge":
      return "Knowledge";
    case "task_attention":
      break;
    default:
      break;
  }
  if (description) {
    const lower = description.toLowerCase();
    if (lower.includes("no activity")) return "No activity";
    if (lower.includes("blocked")) return "Blocked";
    if (lower.includes("rework")) return "Rework";
    if (lower.includes("review")) return "Long Review";
  }
  return "Needs attention";
}

export interface DashboardActionRow {
  subject: string;
  statusLabel: string;
  reasonTag: string;
  contextLine?: string;
}

export function buildDashboardActionRow(item: ActionItem): DashboardActionRow {
  const subject =
    item.personName?.trim() ||
    item.title.trim() ||
    (item.issueKeys?.[0] ?? "Action");

  let statusLabel = "";
  let contextLine = item.description?.trim();

  if (item.description?.includes("·")) {
    const [left, right] = item.description.split("·").map((s) => s.trim());
    statusLabel = left ?? "";
    contextLine = right;
  } else if (item.kind === "workload" && item.count != null) {
    statusLabel = "Workload";
    contextLine = `${item.count} active tasks`;
  } else if (item.kind === "review_bottleneck") {
    statusLabel = "Review";
  } else if (item.kind === "feedback_pending") {
    statusLabel = "Feedback";
  } else if (item.personName) {
    statusLabel = item.title.includes("Review") ? "Team Review" : "Team";
  }

  if (!statusLabel && contextLine) {
    statusLabel = contextLine;
    contextLine = undefined;
  }

  return {
    subject,
    statusLabel,
    reasonTag: actionReasonTag(item.kind, item.description),
    contextLine,
  };
}
