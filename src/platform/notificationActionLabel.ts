import type { NotificationEvent, NotificationTarget } from "./notificationTypes";

export function notificationActionLabel(
  event: NotificationEvent,
  target?: NotificationTarget,
): string | null {
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
