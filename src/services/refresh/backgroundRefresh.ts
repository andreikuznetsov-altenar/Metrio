import { listen } from '@tauri-apps/api/event';
import { createCoalescedRefresh } from './refreshCoordinator';
import {
  PERFORMANCE_BACKGROUND_INTERVAL_SECS,
  SURVEY_BACKGROUND_INTERVAL_SECS,
} from './performanceRefreshCadence';

export type BackgroundRefreshEvent =
  | 'background-jira-refresh'
  | 'background-bamboo-refresh'
  | 'background-app-refresh'
  | 'background-survey-sync'
  | 'system-resumed';

export interface BackgroundRefreshHandlers {
  onJiraRefresh?: () => void | Promise<void>;
  onBambooRefresh?: () => void | Promise<void>;
  onAppRefresh?: () => void | Promise<void>;
  onSurveySync?: () => void | Promise<void>;
  onSystemResumed?: () => void | Promise<void>;
}

export interface CoalescedBackgroundRefreshOptions {
  /** Silent Performance refresh (Jira + optional Bamboo by TTL). */
  refresh: () => Promise<void>;
  /**
   * Gate for system-resumed. Return false when the last successful snapshot
   * is younger than the Performance cadence (15 minutes).
   */
  shouldRefreshOnResume?: () => boolean;
}

const RESUME_DEBOUNCE_MS = 1500;

/** Documented native intervals — keep in sync with `src-tauri/src/lib.rs`. */
export const NATIVE_BACKGROUND_INTERVALS = {
  /** Canonical Performance scheduler. */
  appRefreshSecs: PERFORMANCE_BACKGROUND_INTERVAL_SECS,
  /**
   * Legacy Jira-only emitter retained for host observability.
   * Must NOT trigger a duplicate full Performance refresh.
   */
  jiraRefreshSecs: 30 * 60,
  /**
   * Legacy Bamboo-only emitter retained for host observability.
   * Bamboo freshness is TTL-gated inside the Performance fetch (60m).
   */
  bambooRefreshSecs: 60 * 60,
  surveySyncSecs: SURVEY_BACKGROUND_INTERVAL_SECS,
} as const;

/** Subscribe to native background refresh ticks emitted from the Tauri host. */
export async function registerBackgroundRefreshListeners(
  handlers: BackgroundRefreshHandlers,
): Promise<() => void> {
  const unsubs: Array<() => void> = [];

  if (handlers.onJiraRefresh) {
    unsubs.push(await listen('background-jira-refresh', () => handlers.onJiraRefresh?.()));
  }
  if (handlers.onBambooRefresh) {
    unsubs.push(await listen('background-bamboo-refresh', () => handlers.onBambooRefresh?.()));
  }
  if (handlers.onAppRefresh) {
    unsubs.push(await listen('background-app-refresh', () => handlers.onAppRefresh?.()));
  }
  if (handlers.onSurveySync) {
    unsubs.push(await listen('background-survey-sync', () => handlers.onSurveySync?.()));
  }
  if (handlers.onSystemResumed) {
    unsubs.push(await listen('system-resumed', () => handlers.onSystemResumed?.()));
  }

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

/**
 * Canonical Performance background path:
 * - `background-app-refresh` (15m) → silent coalesced refresh
 * - `system-resumed` (debounced) → silent refresh only when snapshot age ≥ 15m
 *
 * `background-jira-refresh` / `background-bamboo-refresh` are intentionally NOT
 * wired into the full Performance fetch (they previously caused duplicate work).
 * Survey keeps its own 15m emitter; wire via `onSurveySync` when a consumer exists.
 */
export async function registerCoalescedBackgroundRefresh(
  refreshOrOptions:
    | (() => Promise<void>)
    | CoalescedBackgroundRefreshOptions,
): Promise<() => void> {
  const options: CoalescedBackgroundRefreshOptions =
    typeof refreshOrOptions === 'function'
      ? { refresh: refreshOrOptions }
      : refreshOrOptions;

  const coalesced = createCoalescedRefresh(options.refresh);
  let resumeTimer: ReturnType<typeof setTimeout> | undefined;
  let batchScheduled = false;

  const trigger = () => {
    if (batchScheduled) {
      return;
    }
    batchScheduled = true;
    queueMicrotask(() => {
      batchScheduled = false;
      void coalesced();
    });
  };

  return registerBackgroundRefreshListeners({
    onAppRefresh: trigger,
    onSystemResumed: () => {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
      }
      resumeTimer = setTimeout(() => {
        resumeTimer = undefined;
        if (options.shouldRefreshOnResume && !options.shouldRefreshOnResume()) {
          return;
        }
        trigger();
      }, RESUME_DEBOUNCE_MS);
    },
  });
}
