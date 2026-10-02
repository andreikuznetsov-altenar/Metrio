import type { AppPreferences } from "./preferences";
import {
  recordNotificationEvent,
  resolveNotificationByDedupeKey,
} from "./notificationEvents";
import { dispatchNativeNotification } from "./notificationNativeDispatch";

type IntegrationHealth = "healthy" | "unhealthy";

function integrationLabel(integration: "jira" | "bamboo"): string {
  return integration === "jira" ? "Jira" : "BambooHR";
}

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
    key: "jira" | "bamboo";
    stale: boolean;
  }> = [
    { key: "jira", stale: partial.jiraStale ?? prefs.sync.jiraStale },
    { key: "bamboo", stale: partial.bambooStale ?? prefs.sync.bambooStale },
  ];

  for (const { key, stale } of pairs) {
    const prev = state.integrationHealth[key] as IntegrationHealth;
    const next: IntegrationHealth = stale ? "unhealthy" : "healthy";
    if (prev === next) continue;

    const label = integrationLabel(key);
    if (prev === "healthy" && next === "unhealthy") {
      const title = `${label} connection problem`;
      const message = `${label} data could not be refreshed. Check Connections in Settings.`;
      recordNotificationEvent({
        type: "integration_problem",
        title,
        message,
        target: { kind: "settings", section: "connections" },
        dedupeKey: `integration:${key}:unhealthy`,
      });
      void dispatchNativeNotification({ title, body: message }).catch(() => undefined);
    } else if (prev === "unhealthy" && next === "healthy") {
      resolveNotificationByDedupeKey(`integration:${key}:unhealthy`);
      const title = "Connection restored";
      const message = `${label} connection is healthy again.`;
      recordNotificationEvent({
        type: "integration_problem",
        title,
        message,
        severity: "success",
        target: { kind: "settings", section: "connections" },
        dedupeKey: `integration:${key}:restored`,
      });
    }

    state.integrationHealth[key] = next;
  }

  return { ...prefs, notificationState: state };
}
