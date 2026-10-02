import { invoke } from "@tauri-apps/api/core";
import { buildMyWeek } from "../domain/personal/myWeek";
import { buildTrayActionSnapshot } from "../domain/tray/buildTrayActionSnapshot";
import {
  trayMenuItemsFromSnapshot,
  type TrayActionSnapshot,
} from "../domain/tray/trayActionSnapshot";
import { vacationTrayLabelForPerson } from "../domain/vacation/vacationTrayLabel";
import type { Person } from "../domain/people/types";
import type { ReportParams } from "../domain/jira/types";
import {
  markJiraAssignmentRead,
  type JiraAssignmentState,
} from "../domain/jira/jiraAssignmentTracking";
import { bambooEmployeePortalUrl } from "../config/bambooPortal";
import { JIRA_ASSIGNMENT_CHANGED } from "./jiraAssignmentEvents";
import { loadPreferences, savePreferences } from "./preferences";

export interface TrayBuildContext {
  assignmentState: JiraAssignmentState;
  activeTaskCount: number;
  bambooActions: TrayActionSnapshot["bambooActions"];
  upcomingVacation?: TrayActionSnapshot["upcomingVacation"];
}

let lastTrayContext: TrayBuildContext | null = null;

export function trayContextFromSelfPerson(
  person: Person,
  params: ReportParams,
  assignmentState: JiraAssignmentState,
): TrayBuildContext {
  const week = buildMyWeek(person, params);
  const vacationLabel = vacationTrayLabelForPerson(person);
  return {
    assignmentState,
    activeTaskCount: week.summary.currentlyActive,
    bambooActions: [],
    upcomingVacation: vacationLabel
      ? {
          id: person.id,
          label: vacationLabel,
          url: bambooEmployeePortalUrl(),
        }
      : undefined,
  };
}

export async function updateTrayActionCenter(
  snapshot: TrayActionSnapshot,
): Promise<void> {
  const menuItems = trayMenuItemsFromSnapshot(snapshot);
  await invoke("update_tray_snapshot", {
    snapshot: {
      tray_title: snapshot.trayTitle ?? null,
      menu_items: menuItems,
    },
  });
  await invoke("refresh_tray_menu");
}

export async function pushTrayFromContext(context: TrayBuildContext): Promise<void> {
  lastTrayContext = context;
  const snapshot = buildTrayActionSnapshot(context);
  try {
    await updateTrayActionCenter(snapshot);
  } catch {
    // Web / non-Tauri host.
  }
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
  if (lastTrayContext) {
    await pushTrayFromContext({
      ...lastTrayContext,
      assignmentState: nextState,
    });
  }
  window.dispatchEvent(new CustomEvent(JIRA_ASSIGNMENT_CHANGED));
}

export async function clearTrayUserContext(): Promise<void> {
  lastTrayContext = null;
  const empty = buildTrayActionSnapshot({
    assignmentState: {
      baselineComplete: false,
      knownAssignedIssueKeys: [],
      records: {},
    },
    activeTaskCount: 0,
    bambooActions: [],
  });
  try {
    await updateTrayActionCenter(empty);
  } catch {
    // ignore
  }
}
