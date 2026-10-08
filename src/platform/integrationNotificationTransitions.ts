import type { AppPreferences } from "./preferences";
import {
  clearIntegrationProblem,
  setIntegrationProblem,
  type IntegrationProblemSource,
} from "./integrationProblemNotifications";

type IntegrationHealth = "healthy" | "unhealthy";

/**
 * Drive live-state integration_problem notifications from sync health.
 * Notification store owns singleton cards via set/clearIntegrationProblem.
 */
export function processIntegrationNotificationTransitions(
  prefs: AppPreferences,
  partial: { jiraStale?: boolean; bambooStale?: boolean },
): AppPreferences {
  const baseState = prefs.notificationState ?? {
    workloadLevels: {},
    vacationNotified: {},
    problematicCounts: {},
  };
  const state = {
    ...baseState,
    integrationHealth: {
      jira: baseState.integrationHealth?.jira ?? "healthy",
      bamboo: baseState.integrationHealth?.bamboo ?? "healthy",
    },
  };

  const pairs: Array<{
    key: IntegrationProblemSource;
    stale: boolean;
  }> = [
    { key: "jira", stale: partial.jiraStale ?? prefs.sync.jiraStale },
    { key: "bamboo", stale: partial.bambooStale ?? prefs.sync.bambooStale },
  ];

  for (const { key, stale } of pairs) {
    const next: IntegrationHealth = stale ? "unhealthy" : "healthy";
    if (next === "unhealthy") {
      setIntegrationProblem({ source: key });
    } else {
      clearIntegrationProblem(key);
    }
    state.integrationHealth[key] = next;
  }

  return { ...prefs, notificationState: state };
}
