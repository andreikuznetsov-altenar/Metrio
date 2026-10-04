import type { NotificationEvent, NotificationTarget } from "./notificationTypes";

const JIRA_ISSUE_EVENT_TYPES: NotificationEvent["type"][] = [
  "task_attention",
  "jira_assignment",
  "jira_reassignment",
];

function isJiraIssueEvent(event: NotificationEvent, target?: NotificationTarget): boolean {
  if (!JIRA_ISSUE_EVENT_TYPES.includes(event.type)) {
    return false;
  }
  if (event.issueKey?.trim()) {
    return true;
  }
  const resolved = target ?? event.target;
  return resolved?.kind === "jira";
}

export function notificationActionLabel(
  event: NotificationEvent,
  target?: NotificationTarget,
): string | null {
  if (isJiraIssueEvent(event, target)) {
    return "Open Jira";
  }

  const resolved = target ?? event.target;
  if (!resolved) return null;

  switch (resolved.kind) {
    case "jira":
      return "Open Jira";
    case "settings":
      return "Open Settings";
    case "person":
      return "View person";
    case "bamboo":
      return "Open BambooHR";
    case "feedback":
      return "Open Feedback";
    case "goal":
      return "View goal";
    case "performance":
      return "View Performance";
    case "home":
      return "View Dashboard";
    case "digest":
      return "View digest";
    default:
      return "Open";
  }
}
