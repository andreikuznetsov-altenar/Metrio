import { enrichInboxEvent, inboxSourceForType } from "../domain/inbox/actionInboxModel";
import { isActiveIntegrationProblemNotification } from "./integrationProblemNotifications";
import type { NotificationEvent, InboxSourceFilterId } from "./notificationTypes";
import { isToday, isYesterday, parseISO } from "date-fns";

export type NotificationInboxGroupLabel =
  | "Unread"
  | "Today"
  | "Yesterday"
  | "Earlier";

export interface NotificationInboxGroup {
  label: NotificationInboxGroupLabel;
  items: NotificationEvent[];
}

function chronologicalGroupLabel(
  dateIso: string,
): "Today" | "Yesterday" | "Earlier" {
  const date = parseISO(dateIso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return "Earlier";
}

/** Newest first within a bucket. */
function sortByCreatedDesc(events: NotificationEvent[]): NotificationEvent[] {
  return [...events].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function filterNotificationsBySource(
  events: NotificationEvent[],
  sourceFilter: InboxSourceFilterId,
): NotificationEvent[] {
  return events.filter((event) => {
    if (!isActiveIntegrationProblemNotification(event)) return false;
    const item = enrichInboxEvent(event);
    const source = item.source ?? inboxSourceForType(item.type);
    return sourceFilter === "all" || source === sourceFilter;
  });
}

/**
 * Unread notifications always appear before read.
 * Unread: single "Unread" group, newest first.
 * Read: Today → Yesterday → Earlier, newest first within each.
 */
export function groupNotificationsForInbox(
  events: NotificationEvent[],
): NotificationInboxGroup[] {
  const unread = sortByCreatedDesc(events.filter((event) => !event.readAt));
  const read = sortByCreatedDesc(events.filter((event) => event.readAt));

  const groups: NotificationInboxGroup[] = [];
  if (unread.length > 0) {
    groups.push({ label: "Unread", items: unread });
  }

  const readBuckets = new Map<"Today" | "Yesterday" | "Earlier", NotificationEvent[]>();
  for (const event of read) {
    const label = chronologicalGroupLabel(event.createdAt);
    const bucket = readBuckets.get(label) ?? [];
    bucket.push(event);
    readBuckets.set(label, bucket);
  }

  for (const label of ["Today", "Yesterday", "Earlier"] as const) {
    const items = readBuckets.get(label);
    if (items?.length) {
      groups.push({ label, items: sortByCreatedDesc(items) });
    }
  }

  return groups;
}

export function emptyNotificationsMessage(
  sourceFilter: InboxSourceFilterId,
): string {
  if (sourceFilter !== "all") {
    const name =
      sourceFilter === "jira"
        ? "Jira"
        : sourceFilter === "bamboo"
          ? "BambooHR"
          : sourceFilter === "feedback"
            ? "Feedback"
            : "Metrio";
    return `No ${name} notifications`;
  }
  return "No notifications yet";
}
