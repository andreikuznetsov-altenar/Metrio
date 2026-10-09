import { isJiraAssignmentInboxType } from "../domain/inbox/actionInboxModel";
import type { NotificationEvent } from "./notificationTypes";
import {
  clearNotificationHistory,
  deleteNotificationEvent,
  markAllJiraAssignmentInboxEventsRead,
  markAllNotificationEventsRead,
  markNotificationEventRead,
  touchWorkloadNotificationLocalDay,
} from "./notificationEvents";
import { loadPreferences, savePreferences } from "./preferences";
import {
  acknowledgeTrayJiraIssue,
  markAllTrayJiraAssignmentsRead,
} from "./trayActionCenter";

export async function markActionInboxItemRead(
  event: NotificationEvent,
): Promise<void> {
  if (event.issueKey && isJiraAssignmentInboxType(event.type)) {
    await acknowledgeTrayJiraIssue(event.issueKey);
    return;
  }
  markNotificationEventRead(event.id);
}

export async function markAllActionInboxItemsRead(): Promise<void> {
  markAllNotificationEventsRead();
  markAllJiraAssignmentInboxEventsRead();
  await markAllTrayJiraAssignmentsRead();
}

/** Clears notification center history and reconciles tray Jira unread state. */
export async function clearActionInboxHistory(): Promise<void> {
  clearNotificationHistory();
  markAllJiraAssignmentInboxEventsRead();
  await markAllTrayJiraAssignmentsRead();
}

/** Removes one inbox card and applies workload same-day suppression when relevant. */
export async function deleteActionInboxItem(
  event: NotificationEvent,
): Promise<void> {
  deleteNotificationEvent(event.id);
  if (event.type !== "workload_change" || !event.personId) return;
  const prefs = await loadPreferences();
  await savePreferences({
    ...prefs,
    notificationState: touchWorkloadNotificationLocalDay(prefs, event.personId),
  });
}
