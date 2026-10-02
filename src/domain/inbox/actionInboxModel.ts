import type {
  NotificationEvent,
  NotificationEventType,
} from "../../platform/notificationTypes";

export type ActionInboxSource = "jira" | "bamboo" | "feedback" | "metrio";

/** Phase 27 canonical inbox row (extends persisted NotificationEvent). */
export type ActionInboxItem = NotificationEvent & {
  source: ActionInboxSource;
  actionRequired: boolean;
  resolvedAt?: string;
};

const JIRA_TYPES: NotificationEventType[] = [
  "jira_assignment",
  "jira_reassignment",
  "task_attention",
];

const BAMBOO_TYPES: NotificationEventType[] = [
  "vacation_upcoming",
  "vacation_reminder",
  "vacation_return",
  "bamboo_onboarding_action",
  "bamboo_document_action",
];

const FEEDBACK_TYPES: NotificationEventType[] = ["feedback_action"];

export function inboxSourceForType(type: NotificationEventType): ActionInboxSource {
  if (JIRA_TYPES.includes(type)) return "jira";
  if (BAMBOO_TYPES.includes(type)) return "bamboo";
  if (FEEDBACK_TYPES.includes(type)) return "feedback";
  return "metrio";
}

export function inboxActionRequiredForType(type: NotificationEventType): boolean {
  switch (type) {
    case "jira_assignment":
    case "jira_reassignment":
    case "bamboo_document_action":
    case "bamboo_onboarding_action":
    case "feedback_action":
    case "integration_problem":
    case "task_attention":
      return true;
    case "vacation_upcoming":
    case "vacation_reminder":
    case "vacation_return":
    case "workload_change":
    case "availability_change":
    case "daily_brief_ready":
    case "weekly_digest_ready":
    case "goal_review_due":
    case "feedback_requested":
    case "feedback_cycle_due":
      return false;
    case "feedback_delivery_failed":
      return true;
    case "onboarding_step_due":
    case "onboarding_feedback_due":
      return false;
    default:
      return false;
  }
}

export function enrichInboxEvent(event: NotificationEvent): ActionInboxItem {
  const type = event.type;
  return {
    ...event,
    source: event.source ?? inboxSourceForType(type),
    actionRequired: event.actionRequired ?? inboxActionRequiredForType(type),
    resolvedAt: event.resolvedAt,
  };
}

export function isJiraAssignmentInboxType(type: NotificationEventType): boolean {
  return type === "jira_assignment" || type === "jira_reassignment";
}
