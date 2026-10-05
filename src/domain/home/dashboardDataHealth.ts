export const REFRESH_SLOW_MS = 20_000;
export const REFRESH_STUCK_MS = 60_000;

export type DashboardDataHealthState =
  | "cold_start"
  | "initial_loading"
  | "ready"
  | "refreshing"
  | "stale"
  | "refresh_failed_with_cache"
  | "refresh_failed_without_cache"
  | "refresh_stuck";

export interface DashboardDataHealthInput {
  hasEverSuccessfulSnapshot: boolean;
  hasUsableDashboardData: boolean;
  refreshing: boolean;
  stale: boolean;
  errorMessage: string | null;
  refreshStartedAt: number | null;
  now: number;
}

export interface DashboardDataHealthResult {
  state: DashboardDataHealthState;
  showSlowRefreshHint: boolean;
  refreshElapsedMs: number | null;
}

/** Resolves executive dashboard data lifecycle for Home routing and sync copy. */
export function resolveDashboardDataHealth(
  input: DashboardDataHealthInput,
): DashboardDataHealthResult {
  const refreshElapsedMs =
    input.refreshStartedAt != null ? input.now - input.refreshStartedAt : null;

  const showSlowRefreshHint = Boolean(
    input.refreshing &&
      refreshElapsedMs != null &&
      refreshElapsedMs >= REFRESH_SLOW_MS &&
      refreshElapsedMs < REFRESH_STUCK_MS,
  );

  if (
    input.refreshing &&
    refreshElapsedMs != null &&
    refreshElapsedMs >= REFRESH_STUCK_MS
  ) {
    return {
      state: "refresh_stuck",
      showSlowRefreshHint: false,
      refreshElapsedMs,
    };
  }

  if (!input.hasUsableDashboardData) {
    if (input.errorMessage) {
      return {
        state: "refresh_failed_without_cache",
        showSlowRefreshHint,
        refreshElapsedMs,
      };
    }
    if (input.refreshing) {
      return {
        state: "initial_loading",
        showSlowRefreshHint,
        refreshElapsedMs,
      };
    }
    if (!input.hasEverSuccessfulSnapshot) {
      return {
        state: "cold_start",
        showSlowRefreshHint,
        refreshElapsedMs,
      };
    }
    return {
      state: "initial_loading",
      showSlowRefreshHint,
      refreshElapsedMs,
    };
  }

  if (input.errorMessage && input.stale) {
    return {
      state: "refresh_failed_with_cache",
      showSlowRefreshHint,
      refreshElapsedMs,
    };
  }

  if (input.refreshing) {
    return {
      state: "refreshing",
      showSlowRefreshHint,
      refreshElapsedMs,
    };
  }

  if (input.stale) {
    return {
      state: "stale",
      showSlowRefreshHint,
      refreshElapsedMs,
    };
  }

  return {
    state: "ready",
    showSlowRefreshHint,
    refreshElapsedMs,
  };
}
