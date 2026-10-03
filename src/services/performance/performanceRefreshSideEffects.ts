import { processNotificationTransitions } from "../../platform/notifications";
import { processIntegrationNotificationTransitions } from "../../platform/integrationNotificationTransitions";
import { loadPreferences, savePreferences } from "../../platform/preferences";
import type { PerformanceFetchResult } from "./performanceTypes";
import { getOperationalIssues } from "../../domain/people/ownedIssues";
import {
  processJiraAssignmentNotifications,
  readJiraAssignmentState,
} from "../../platform/jiraAssignmentNotifications";
import {
  pushTrayFromContext,
  trayContextFromSelfPerson,
} from "../../platform/trayActionCenter";
import { runDigestCycle } from "../../platform/runDigestCycle";
import type { CurrentUser, UserRole } from "../../domain/types";
import { loadGoalsData } from "../goals/goalsPersistence";
import { syncGoalReviewNotifications } from "../../platform/goalReviewNotifications";
import type { PerformanceViewModels } from "./performanceViewModel";
import { readCalendarCache } from "../../platform/calendarCache";
import { formatMeetingTime } from "../../domain/calendar/formatMeetingTime";
import {
  noteRefreshCompleted,
  recordIntegrationRefresh,
} from "../../platform/observability/observabilityStore";

export interface PerformanceSideEffectOptions {
  selfPersonId: string;
  role: UserRole;
  viewModels?: PerformanceViewModels | null;
  currentUser?: CurrentUser | null;
}

function nextTrayOneOnOnePrep() {
  const cached = readCalendarCache();
  const meeting = cached?.oneOnOnes[0];
  if (!meeting?.otherPersonId) return undefined;
  const name = meeting.otherPersonName ?? "1:1";
  return {
    personId: meeting.otherPersonId,
    label: `1:1 with ${name} · ${formatMeetingTime(meeting.start)} · Prepare`,
  };
}

function resolveSelfPerson(
  result: PerformanceFetchResult,
  selfPersonId: string,
) {
  return (
    result.teamSnapshot.persons.find((person) => person.id === selfPersonId) ??
    result.teamSnapshot.persons[0]
  );
}

export async function applyPerformanceRefreshSideEffects(
  result: PerformanceFetchResult,
  options: PerformanceSideEffectOptions,
): Promise<void> {
  const started = performance.now();
  const params = result.reportParams;
  const now = result.lastUpdatedAt || new Date().toISOString();
  const self = resolveSelfPerson(result, options.selfPersonId);

  let prefs = await loadPreferences();

  if (self && params) {
    const issues = getOperationalIssues(self);
    prefs = processJiraAssignmentNotifications(issues, prefs, now).nextPrefs;
    const assignmentState = readJiraAssignmentState(prefs);
    const trayBase = trayContextFromSelfPerson(self, params, assignmentState);
    await pushTrayFromContext({
      ...trayBase,
      nextOneOnOne: prefs.google.calendarConnected
        ? nextTrayOneOnOnePrep()
        : undefined,
    });
  } else {
    await pushTrayFromContext({
      assignmentState: readJiraAssignmentState(prefs),
      activeTaskCount: 0,
      bambooActions: [],
    });
  }

  const notificationPersons = self ? [self] : [];
  try {
    prefs = await processNotificationTransitions(
      notificationPersons,
      prefs,
      params,
    );
  } catch {
    // Notification plugin unavailable (web dev).
  }

  prefs = processIntegrationNotificationTransitions(prefs, {
    jiraStale: false,
    bambooStale: false,
  });

  const digestResult = runDigestCycle({
    prefs,
    result,
    viewModels: options.viewModels ?? null,
    selfPersonId: options.selfPersonId,
    role: options.role,
  });
  prefs = digestResult.prefs;

  if (options.currentUser) {
    try {
      const goalsFile = await loadGoalsData();
      syncGoalReviewNotifications(goalsFile.goals, options.currentUser);
    } catch {
      // Goals store unavailable (web dev).
    }
  }

  await savePreferences({
    ...prefs,
    sync: {
      ...prefs.sync,
      lastJiraSync: now,
      lastBambooSync: now,
      lastSnapshotAt: now,
      jiraStale: false,
      bambooStale: false,
    },
  });

  const durationMs = Math.round(performance.now() - started);
  const partial = result.partialWarnings.length > 0;
  recordIntegrationRefresh(
    "jira",
    "Jira",
    partial ? "partial" : "success",
    durationMs,
    undefined,
    partial ? result.partialWarnings.join("; ") : undefined,
  );
  recordIntegrationRefresh("bamboo", "BambooHR", partial ? "partial" : "success", durationMs);
  noteRefreshCompleted();
}

export async function markPerformanceIntegrationsStale(
  partial: { jira?: boolean; bamboo?: boolean } = { jira: true, bamboo: true },
): Promise<void> {
  const prefs = await loadPreferences();
  const withStale = {
    ...prefs,
    sync: {
      ...prefs.sync,
      jiraStale: partial.jira ? true : prefs.sync.jiraStale,
      bambooStale: partial.bamboo ? true : prefs.sync.bambooStale,
    },
  };
  const nextPrefs = processIntegrationNotificationTransitions(withStale, {
    jiraStale: withStale.sync.jiraStale,
    bambooStale: withStale.sync.bambooStale,
  });
  await savePreferences(nextPrefs);
}
