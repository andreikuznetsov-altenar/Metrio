import { listen } from '@tauri-apps/api/event';
import { createCoalescedRefresh } from './refreshCoordinator';

export type BackgroundRefreshEvent =
  | 'background-jira-refresh'
  | 'background-bamboo-refresh'
  | 'background-app-refresh'
  | 'system-resumed';

export interface BackgroundRefreshHandlers {
  onJiraRefresh?: () => void | Promise<void>;
  onBambooRefresh?: () => void | Promise<void>;
  onAppRefresh?: () => void | Promise<void>;
  onSystemResumed?: () => void | Promise<void>;
}

const RESUME_DEBOUNCE_MS = 1500;

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
  if (handlers.onSystemResumed) {
    unsubs.push(await listen('system-resumed', () => handlers.onSystemResumed?.()));
  }

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

/**
 * Routes Jira, Bamboo, and resume events into one coalesced refresh callback.
 * Resume is debounced so wake-from-sleep does not stack with immediate emitter ticks.
 */
export async function registerCoalescedBackgroundRefresh(
  refresh: () => Promise<void>,
): Promise<() => void> {
  const coalesced = createCoalescedRefresh(refresh);
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
    onJiraRefresh: trigger,
    onBambooRefresh: trigger,
    onAppRefresh: trigger,
    onSystemResumed: () => {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
      }
      resumeTimer = setTimeout(() => {
        resumeTimer = undefined;
        trigger();
      }, RESUME_DEBOUNCE_MS);
    },
  });
}
