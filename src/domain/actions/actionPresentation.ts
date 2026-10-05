import type { ActionItem, ActionKind } from "./actionTypes";

const REASON_TAG_PRIORITY = [
  "Blocked",
  "Problematic",
  "No activity",
  "Long Review",
  "Overloaded",
  "Upcoming leave",
  "Leave delivery risk",
  "Feedback pending",
  "Delivery dependency",
  "Knowledge gap",
  "Knowledge",
  "Needs attention",
] as const;

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
    if (lower.includes("problematic")) return "Problematic";
    if (lower.includes("blocked")) return "Blocked";
    if (lower.includes("no activity")) return "No activity";
    if (lower.includes("rework")) return "Rework";
    if (lower.includes("review")) return "Long Review";
  }
  return "Needs attention";
}

export function mergeReasonTags(tags: string[]): string[] {
  const unique = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
    out.push(trimmed);
  }
  const rank = (tag: string) => {
    const idx = REASON_TAG_PRIORITY.indexOf(tag as (typeof REASON_TAG_PRIORITY)[number]);
    return idx >= 0 ? idx : REASON_TAG_PRIORITY.length;
  };
  return out.sort((a, b) => rank(a) - rank(b));
}

export function presentationReasonTagsForItem(item: ActionItem): string[] {
  if (item.kind === "review_bottleneck" && item.count != null && item.count > 1) {
    return ["Long Review"];
  }
  return mergeReasonTags([actionReasonTag(item.kind, item.description)]);
}

export function presentationSubjectForItem(item: ActionItem): string {
  if (item.kind === "review_bottleneck" && item.count != null && item.count > 1) {
    return item.title.trim();
  }
  return (
    item.personName?.trim() ||
    item.title.trim() ||
    (item.issueKeys?.[0] ?? "Action")
  );
}

function stageAgeInReviewContext(description?: string): string | null {
  if (!description?.trim()) return null;
  const lower = description.toLowerCase();
  if (lower.includes("no activity")) return null;
  const parts = description.split("·").map((part) => part.trim()).filter(Boolean);
  const stageAge = parts.length > 1 ? parts[parts.length - 1]! : parts[0]!;
  if (!stageAge) return null;
  if (/in review/i.test(stageAge)) return stageAge;
  if (/\d/.test(stageAge) && /day/i.test(stageAge)) {
    return `${stageAge} in review`;
  }
  if (/review/i.test(parts[0] ?? "") && stageAge) {
    return stageAge.includes("day") ? `${stageAge} in review` : stageAge;
  }
  return null;
}

function issuePreviewSubtext(description?: string): string | null {
  if (!description?.trim()) return null;
  return description
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ")
    .replace(/, \+(\d+)/, " +$1");
}

export function presentationContextLinesForItem(item: ActionItem): string[] {
  if (item.kind === "workload" && item.count != null) {
    return [`${item.count} active tasks`];
  }

  if (item.kind === "review_bottleneck") {
    if (item.count != null && item.count > 1) {
      const lines = [`${item.count} tasks`];
      const preview = issuePreviewSubtext(item.description);
      if (preview) lines.push(preview);
      return lines;
    }
    const reviewContext = stageAgeInReviewContext(item.description);
    if (reviewContext) return [reviewContext];
  }

  if (item.kind === "task_attention") {
    const desc = item.description?.trim();
    if (!desc) return [];
    const reviewContext = stageAgeInReviewContext(desc);
    if (reviewContext) return [reviewContext];
    const lower = desc.toLowerCase();
    if (lower.includes("no activity")) return [desc];
    if (desc.includes("·")) {
      const parts = desc.split("·").map((part) => part.trim()).filter(Boolean);
      return parts.length > 1 ? [parts.slice(1).join(" · ")] : [desc];
    }
    return [desc];
  }

  if (item.kind === "feedback_pending") {
    return item.description?.trim() ? [item.description.trim()] : [];
  }

  if (item.kind === "upcoming_leave" || item.kind === "leave_delivery_risk") {
    return item.description?.trim() ? [item.description.trim()] : [];
  }

  if (item.kind === "delivery_dependency") {
    return item.description?.trim() ? [item.description.trim()] : [];
  }

  const desc = item.description?.trim();
  return desc ? [desc] : [];
}

/** @deprecated Use buildDashboardQueueRows for dashboard surfaces. */
export interface DashboardActionRow {
  subject: string;
  statusLabel: string;
  reasonTag: string;
  contextLine?: string;
}

/** @deprecated Performance overview layout; dashboard uses buildDashboardQueueRows. */
export function buildDashboardActionRow(item: ActionItem): DashboardActionRow {
  const reasonTags = presentationReasonTagsForItem(item);
  const contextLines = presentationContextLinesForItem(item);
  return {
    subject: presentationSubjectForItem(item),
    statusLabel: "",
    reasonTag: reasonTags[0] ?? "Needs attention",
    contextLine: contextLines.join(" · ") || undefined,
  };
}
