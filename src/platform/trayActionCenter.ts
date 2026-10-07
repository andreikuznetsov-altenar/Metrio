import { buildTrayActionSnapshot } from "../domain/tray/buildTrayActionSnapshot";
import { buildTraySummaryModel } from "../domain/tray/buildTraySummaryModel";
import type { TraySummaryModel } from "../domain/tray/buildTraySummaryModel";
import {
  trayMenuItemsFromSummary,
  type TrayActionSnapshot,
} from "../domain/tray/trayActionSnapshot";
import { countUnreadNotificationEvents } from "./notificationEvents";
import { pushTraySummaryToNative } from "./traySummaryBridge";
import { registerTrayContextForUpdate } from "./trayUpdateBridge";
import {
  markJiraAssignmentRead,
  unreadJiraAssignments,
  type JiraAssignmentState,
} from "../domain/jira/jiraAssignmentTracking";
import { loadPreferences, savePreferences } from "./preferences";
import { markInboxJiraEventsReadForIssueKey } from "./notificationEvents";
import { JIRA_ASSIGNMENT_CHANGED } from "./jiraAssignmentEvents";

export interface TrayBuildContext {
  summary: TraySummaryModel;
  softwareUpdateAvailable?: boolean;
}

let lastTrayContext: TrayBuildContext | null = null;

export function getLastTrayBuildContext(): TrayBuildContext | null {
  return lastTrayContext;
}

export function emptyTraySummary(): TraySummaryModel {
  return buildTraySummaryModel({
    role: "employee",
    openTaskCount: 0,
    problemTaskCount: 0,
    indexLabel: "Personal index",
    indexValue: "—",
    indexAvailable: true,
    unreadNotificationCount: countUnreadNotificationEvents(),
  });
}

export async function pushTrayFromContext(context: TrayBuildContext): Promise<void> {
  lastTrayContext = context;
  registerTrayContextForUpdate(context);
  const snapshot: TrayActionSnapshot = buildTrayActionSnapshot(context.summary);
  const menuItems = trayMenuItemsFromSummary(snapshot.summary);
  if (context.softwareUpdateAvailable) {
    const quitIndex = menuItems.findIndex((item) => item.id === "quit");
    menuItems.splice(quitIndex, 0, {
      id: "update-available",
      label: "Update available",
    });
  }
  try {
    await pushTraySummaryToNative(snapshot.summary, menuItems);
  } catch {
    // Web / non-Tauri host.
  }
}

export async function refreshTrayFromLastContext(): Promise<void> {
  if (!lastTrayContext) return;
  const unread = countUnreadNotificationEvents();
  await pushTrayFromContext({
    ...lastTrayContext,
    summary: {
      ...lastTrayContext.summary,
      unreadNotificationCount: unread,
      trayTitle: unread > 0 ? String(unread) : undefined,
    },
  });
}

export async function clearTrayUserContext(): Promise<void> {
  lastTrayContext = null;
  await pushTrayFromContext({ summary: emptyTraySummary() });
}

export async function acknowledgeTrayJiraIssue(issueKey: string): Promise<void> {
  const prefs = await loadPreferences();
  const state = prefs.notificationState.jiraAssignment;
  if (!state) return;
  const readAt = new Date().toISOString();
  const nextState = markJiraAssignmentRead(state, issueKey, readAt);
  await savePreferences({
    ...prefs,
    notificationState: {
      ...prefs.notificationState,
      jiraAssignment: nextState,
    },
  });
  markInboxJiraEventsReadForIssueKey(issueKey);
  await refreshTrayFromLastContext();
  window.dispatchEvent(new CustomEvent(JIRA_ASSIGNMENT_CHANGED));
}

export async function markAllTrayJiraAssignmentsRead(): Promise<void> {
  const prefs = await loadPreferences();
  const state = prefs.notificationState.jiraAssignment;
  if (!state || unreadJiraAssignments(state).length === 0) return;
  const readAt = new Date().toISOString();
  const records = { ...state.records };
  for (const key of Object.keys(records)) {
    if (!records[key].readAt) {
      records[key] = { ...records[key], readAt };
    }
  }
  const nextState: JiraAssignmentState = { ...state, records };
  await savePreferences({
    ...prefs,
    notificationState: {
      ...prefs.notificationState,
      jiraAssignment: nextState,
    },
  });
  await refreshTrayFromLastContext();
  window.dispatchEvent(new CustomEvent(JIRA_ASSIGNMENT_CHANGED));
}
