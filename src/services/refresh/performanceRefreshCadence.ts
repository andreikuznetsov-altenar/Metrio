import type { TimeOffEntry } from "../../domain/people/availability";

/** Canonical Performance / Jira background cadence (native `background-app-refresh`). */
export const PERFORMANCE_BACKGROUND_INTERVAL_SECS = 15 * 60;
export const PERFORMANCE_BACKGROUND_INTERVAL_MS =
  PERFORMANCE_BACKGROUND_INTERVAL_SECS * 1000;

/** Bamboo roster / time-off reuse window. */
export const BAMBOO_TTL_MS = 60 * 60 * 1000;

/** Survey emitter stays on its own 15-minute schedule (unchanged). */
export const SURVEY_BACKGROUND_INTERVAL_SECS = 15 * 60;

export type BambooTimeOffCache = {
  fetchedAtMs: number;
  entries: TimeOffEntry[];
};

let bambooTimeOffCache: BambooTimeOffCache | null = null;

/** Test / credential-change hook. */
export function clearBambooTimeOffCache(): void {
  bambooTimeOffCache = null;
}

export function getBambooTimeOffCache(): BambooTimeOffCache | null {
  return bambooTimeOffCache;
}

export function noteBambooTimeOffFetched(
  entries: TimeOffEntry[],
  fetchedAtMs: number = Date.now(),
): void {
  bambooTimeOffCache = { fetchedAtMs, entries: [...entries] };
}

export function isBambooTimeOffFresh(
  nowMs: number = Date.now(),
  ttlMs: number = BAMBOO_TTL_MS,
): boolean {
  if (!bambooTimeOffCache) return false;
  return nowMs - bambooTimeOffCache.fetchedAtMs < ttlMs;
}

/**
 * Background ticks reuse Bamboo when TTL is valid.
 * Forced refreshes (manual / reconnect / credential change) always refetch.
 */
export function shouldFetchBambooTimeOff(options: {
  force: boolean;
  nowMs?: number;
}): boolean {
  if (options.force) return true;
  return !isBambooTimeOffFresh(options.nowMs);
}

/** Resume should refresh only when the last successful snapshot is stale. */
export function shouldRefreshOnSystemResume(
  lastSuccessfulUpdatedAt: string | null | undefined,
  nowMs: number = Date.now(),
  maxAgeMs: number = PERFORMANCE_BACKGROUND_INTERVAL_MS,
): boolean {
  if (!lastSuccessfulUpdatedAt) return true;
  const parsed = Date.parse(lastSuccessfulUpdatedAt);
  if (!Number.isFinite(parsed)) return true;
  return nowMs - parsed >= maxAgeMs;
}
