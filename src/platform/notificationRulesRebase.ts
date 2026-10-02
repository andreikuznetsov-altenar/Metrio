import type { AppPreferences } from "./preferences";

/**
 * When operational attention rules change, reset per-issue health transition keys
 * so notifications are not replayed in bulk. Workload/vacation dedupe keys are kept.
 */
export function rebaseNotificationStateForOperationalRulesChange(
  state: AppPreferences["notificationState"],
): AppPreferences["notificationState"] {
  const workloadLevels: Record<string, string> = {};
  for (const [key, value] of Object.entries(state.workloadLevels)) {
    if (!key.includes(":")) {
      workloadLevels[key] = value;
      continue;
    }
    // personId:issueKey issue health tracking — drop to avoid alert storm
  }
  return {
    ...state,
    workloadLevels,
    problematicCounts: { ...state.problematicCounts },
    vacationNotified: { ...state.vacationNotified },
  };
}
