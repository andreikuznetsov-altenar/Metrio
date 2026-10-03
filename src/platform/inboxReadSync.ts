import { isJiraAssignmentInboxType } from "../domain/inbox/actionInboxModel";
import type { NotificationEvent } from "./notificationTypes";
import {
  clearNotificationHistory,
  markAllJiraAssignmentInboxEventsRead,
  markAllNotificationEventsRead,
  markNotificationEventRead,
} from "./notificationEvents";
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
