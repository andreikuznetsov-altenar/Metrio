import type { AuditIssue } from "../domain/jira/types";
import {
  EMPTY_JIRA_ASSIGNMENT_STATE,
  processJiraAssignmentSnapshot,
  type JiraAssignmentRecord,
  type JiraAssignmentState,
} from "../domain/jira/jiraAssignmentTracking";
import type { AppPreferences } from "./preferences";
import {
  recordNotificationEvent,
  type RecordNotificationEventInput,
} from "./notificationEvents";
import {
  dispatchNativeNotification,
  type NativeNotificationDescriptor,
} from "./notificationNativeDispatch";

function descriptorForAssignment(
  record: JiraAssignmentRecord,
): RecordNotificationEventInput & { native?: NativeNotificationDescriptor } {
  const title =
    record.type === "jira_reassignment"
      ? "Task reassigned to you"
      : "New task assigned";
  const message = `${record.issueKey} · ${record.title}`;
  return {
    type: record.type,
    title,
    message,
    issueKey: record.issueKey,
    issueTitle: record.title,
    target: { kind: "jira", issueKey: record.issueKey },
    dedupeKey: `${record.type}:${record.issueKey}:${record.assignedAt}`,
    native: { title, body: message },
  };
}

export function processJiraAssignmentNotifications(
  issues: AuditIssue[],
  prefs: AppPreferences,
  nowIso: string,
): { nextPrefs: AppPreferences; newAssignmentCount: number } {
  const prevState =
    prefs.notificationState.jiraAssignment ?? EMPTY_JIRA_ASSIGNMENT_STATE;
  const { newRecords, nextState } = processJiraAssignmentSnapshot(
    issues,
    prevState,
    nowIso,
  );

  const jiraAlertsEnabled = prefs.notifications.jiraAssignmentAlerts ?? true;

  for (const record of newRecords) {
    const descriptor = descriptorForAssignment(record);
    recordNotificationEvent(descriptor);
    if (jiraAlertsEnabled && descriptor.native) {
      void dispatchNativeNotification(descriptor.native);
    }
  }

  return {
    newAssignmentCount: newRecords.length,
    nextPrefs: {
      ...prefs,
      notificationState: {
        ...prefs.notificationState,
        jiraAssignment: nextState,
      },
    },
  };
}

export function readJiraAssignmentState(
  prefs: AppPreferences,
): JiraAssignmentState {
  return prefs.notificationState.jiraAssignment ?? EMPTY_JIRA_ASSIGNMENT_STATE;
}
