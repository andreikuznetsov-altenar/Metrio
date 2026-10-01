import { updateTrayFromSnapshot } from "../../platform/tray";
import { processNotificationTransitions } from "../../platform/notifications";
import { loadPreferences, savePreferences } from "../../platform/preferences";
import type { TeamSnapshot } from "../../domain/people/types";
import type { PerformanceFetchResult } from "./performanceTypes";

export interface PerformanceSideEffectOptions {
  /** When true, tray copy reflects manager team radar; otherwise personal My Week. */
  managerTeamTray: boolean;
}

function traySnapshot(
  result: PerformanceFetchResult,
  managerTeamTray: boolean,
): TeamSnapshot {
  if (managerTeamTray && result.teamSnapshot.mode === "team") {
    return result.teamSnapshot;
  }
  if (
    result.teamSnapshot.mode === "personal" ||
    result.teamSnapshot.mode === "personal_limited"
  ) {
    return result.teamSnapshot;
  }
  const self =
    result.teamSnapshot.persons.find(
      (person) => person.id === result.teamSnapshot.persons[0]?.id,
    ) ?? result.teamSnapshot.persons[0];
  if (!self) {
    return result.teamSnapshot;
  }
  return {
    mode: "personal",
    persons: [self],
    summary: result.teamSnapshot.summary,
  };
}

export async function applyPerformanceRefreshSideEffects(
  result: PerformanceFetchResult,
  options: PerformanceSideEffectOptions,
): Promise<void> {
  const snapshot = traySnapshot(result, options.managerTeamTray);
  const params = result.reportParams;

  try {
    await updateTrayFromSnapshot(snapshot, params);
  } catch {
    // Desktop host only.
  }

  const prefs = await loadPreferences();
  const now = result.lastUpdatedAt || new Date().toISOString();
  let nextPrefs = prefs;
  try {
    nextPrefs = await processNotificationTransitions(
      snapshot.persons,
      prefs,
      params,
    );
  } catch {
    // Notification plugin unavailable (web dev).
  }

  await savePreferences({
    ...nextPrefs,
    sync: {
      ...nextPrefs.sync,
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
  await savePreferences({
    ...prefs,
    sync: {
      ...prefs.sync,
      jiraStale: partial.jira ? true : prefs.sync.jiraStale,
      bambooStale: partial.bamboo ? true : prefs.sync.bambooStale,
    },
  });
}
