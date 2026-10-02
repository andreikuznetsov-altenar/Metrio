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

export interface PerformanceSideEffectOptions {
  selfPersonId: string;
  role: UserRole;
  viewModels?: PerformanceViewModels | null;
  currentUser?: CurrentUser | null;
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
  const params = result.reportParams;
  const now = result.lastUpdatedAt || new Date().toISOString();
  const self = resolveSelfPerson(result, options.selfPersonId);

  let prefs = await loadPreferences();

  if (self && params) {
    const issues = getOperationalIssues(self);
    prefs = processJiraAssignmentNotifications(issues, prefs, now).nextPrefs;
    const assignmentState = readJiraAssignmentState(prefs);
    await pushTrayFromContext(
      trayContextFromSelfPerson(self, params, assignmentState),
    );
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
