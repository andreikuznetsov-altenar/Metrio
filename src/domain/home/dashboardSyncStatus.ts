import type { DashboardDataHealthState } from "./dashboardDataHealth";

export interface DashboardSyncStatusInput {
  lastUpdatedAt: string | null;
  refreshing: boolean;
  stale: boolean;
  errorMessage: string | null;
  healthState?: DashboardDataHealthState;
  showSlowRefreshHint?: boolean;
}

export interface DashboardSyncStatus {
  line: string;
  showRetry: boolean;
  showDiagnostics?: boolean;
}

/** Subtle Dashboard greeting sync line — never blocks content. */
export function buildDashboardSyncStatus(
  input: DashboardSyncStatusInput,
): DashboardSyncStatus | null {
  const { lastUpdatedAt, refreshing, healthState } = input;

  if (healthState === "refresh_stuck") {
    return {
      line: "Refresh is taking longer than expected. You can retry or open diagnostics.",
      showRetry: true,
      showDiagnostics: true,
    };
  }

  if (!lastUpdatedAt) {
    if (refreshing) {
      return { line: "Loading performance data…", showRetry: false };
    }
    return null;
  }

  return null;
}
