import { listen } from '@tauri-apps/api/event';

export type BackgroundRefreshEvent =
  | 'background-jira-refresh'
  | 'background-bamboo-refresh'
  | 'system-resumed';

export interface BackgroundRefreshHandlers {
  onJiraRefresh?: () => void | Promise<void>;
  onBambooRefresh?: () => void | Promise<void>;
  onSystemResumed?: () => void | Promise<void>;
}

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
  if (handlers.onSystemResumed) {
    unsubs.push(await listen('system-resumed', () => handlers.onSystemResumed?.()));
  }

  return () => {
    for (const unsub of unsubs) unsub();
  };
}
