import { enrichInboxEvent, inboxSourceForType } from "../domain/inbox/actionInboxModel";

export type NotificationEventType =
  | "task_attention"
  | "workload_change"
  | "vacation_upcoming"
  | "vacation_reminder"
  | "vacation_return"
  | "availability_change"
  | "integration_problem"
  | "jira_assignment"
  | "jira_reassignment"
  | "bamboo_onboarding_action"
  | "bamboo_document_action"
  | "feedback_action"
  | "daily_brief_ready"
  | "weekly_digest_ready"
  | "goal_review_due"
  | "feedback_requested"
  | "feedback_delivery_failed"
  | "feedback_cycle_due"
  | "onboarding_step_due"
  | "onboarding_feedback_due";

export type ActionInboxSource = "jira" | "bamboo" | "feedback" | "metrio";

export type NotificationTarget =
  | { kind: "person"; personId: string }
  | { kind: "jira"; issueKey: string }
  | { kind: "settings"; section: "connections" }
  | { kind: "performance"; tab: "radar" | "people" | "delivery-risk" | "overview" }
  | { kind: "feedback"; tab: "survey" | "delivery" | "results" | "history" | "cycles" }
  | { kind: "bamboo" }
  | { kind: "home" }
  | { kind: "digest"; digestKind: "daily" | "weekly" }
  | { kind: "goal"; goalId: string };

/** @deprecated Use InboxFilterId */
export type NotificationFilterId =
  | "all"
  | "tasks"
  | "people"
  | "time_off"
  | "system";

export type InboxFilterId = "all" | "unread" | "actions";

export type InboxSourceFilterId = "all" | "jira" | "bamboo" | "feedback" | "metrio";

export type NotificationSeverity = "info" | "warning" | "danger" | "success";

export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  createdAt: string;
  readAt?: string;
  resolvedAt?: string;
  title: string;
  message: string;
  personId?: string;
  personName?: string;
  issueKey?: string;
  issueTitle?: string;
  severity?: NotificationSeverity;
  target?: NotificationTarget;
  dedupeKey?: string;
  /** User dismissed the inbox card (hydration may strip these). */
  deletedAt?: string;
  source?: ActionInboxSource;
  actionRequired?: boolean;
}

const TASK_TYPES: NotificationEventType[] = [
  "task_attention",
  "jira_assignment",
  "jira_reassignment",
];
const PEOPLE_TYPES: NotificationEventType[] = [
  "workload_change",
  "availability_change",
];
const TIME_OFF_TYPES: NotificationEventType[] = [
  "vacation_upcoming",
  "vacation_reminder",
  "vacation_return",
];
const SYSTEM_TYPES: NotificationEventType[] = [
  "integration_problem",
  "bamboo_onboarding_action",
  "bamboo_document_action",
  "feedback_action",
];

export function notificationMatchesFilter(
  event: NotificationEvent,
  filter: NotificationFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "tasks") return TASK_TYPES.includes(event.type);
  if (filter === "people") return PEOPLE_TYPES.includes(event.type);
  if (filter === "time_off") return TIME_OFF_TYPES.includes(event.type);
  return SYSTEM_TYPES.includes(event.type);
}

export function inboxMatchesFilter(
  event: NotificationEvent,
  filter: InboxFilterId,
  sourceFilter: InboxSourceFilterId = "all",
): boolean {
  const item = enrichInboxEvent(event);
  if (item.resolvedAt && filter === "actions") return false;
  // Live-state integration incidents: never show resolved / restored leftovers.
  if (
    item.type === "integration_problem" &&
    (item.resolvedAt || item.dedupeKey?.endsWith(":restored"))
  ) {
    return false;
  }
  if (filter === "unread" && item.readAt) return false;
  if (filter === "actions" && !item.actionRequired) return false;
  const source = item.source ?? inboxSourceForType(item.type);
  if (sourceFilter !== "all" && source !== sourceFilter) return false;
  return true;
}

export function severityForNotificationType(
  type: NotificationEventType,
): NotificationSeverity {
  switch (type) {
    case "task_attention":
    case "workload_change":
    case "integration_problem":
    case "jira_assignment":
    case "jira_reassignment":
    case "bamboo_onboarding_action":
    case "bamboo_document_action":
    case "feedback_action":
      return "warning";
    case "vacation_return":
      return "success";
    case "vacation_upcoming":
    case "vacation_reminder":
    case "availability_change":
      return "info";
    default:
      return "info";
  }
}

type LegacyNotificationEvent = NotificationEvent & {
  navigationTarget?: string;
  type: NotificationEventType | string;
};

function parseLegacyTarget(
  navigationTarget?: string,
  personId?: string,
  issueKey?: string,
): NotificationTarget | undefined {
  if (navigationTarget?.startsWith("person:")) {
    return { kind: "person", personId: navigationTarget.slice("person:".length) };
  }
  if (issueKey) {
    return { kind: "jira", issueKey };
  }
  if (personId) {
    return { kind: "person", personId };
  }
  return undefined;
}

function migrateLegacyType(type: string): NotificationEventType {
  switch (type) {
    case "upcoming_time_off":
      return "vacation_upcoming";
    case "returns":
      return "vacation_return";
    case "problematic_task":
      return "task_attention";
    default:
      return type as NotificationEventType;
  }
}

export function normalizeStoredNotificationEvent(
  raw: LegacyNotificationEvent,
): NotificationEvent {
  const type = migrateLegacyType(raw.type);
  const target =
    raw.target ??
    parseLegacyTarget(raw.navigationTarget, raw.personId, raw.issueKey);
  return {
    id: raw.id,
    type,
    createdAt: raw.createdAt,
    readAt: raw.readAt,
    title: raw.title,
    message: raw.message,
    personId: raw.personId,
    personName: raw.personName,
    issueKey: raw.issueKey,
    issueTitle: raw.issueTitle,
    severity: raw.severity ?? severityForNotificationType(type),
    target,
    dedupeKey: raw.dedupeKey,
    deletedAt: raw.deletedAt,
    resolvedAt: raw.resolvedAt,
    source: raw.source,
    actionRequired: raw.actionRequired,
  };
}
