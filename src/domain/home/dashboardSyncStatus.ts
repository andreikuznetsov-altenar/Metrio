import { format, parseISO } from "date-fns";
import { formatRelativeSync } from "../../platform/observability/connectionDiagnostics";
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

function formatClockTime(iso: string): string {
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return iso;
  }
}

/** Subtle Dashboard greeting sync line — never blocks content. */
export function buildDashboardSyncStatus(
  input: DashboardSyncStatusInput,
): DashboardSyncStatus | null {
  const {
    lastUpdatedAt,
    refreshing,
    stale,
    errorMessage,
    healthState,
    showSlowRefreshHint,
  } = input;

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

  if (refreshing) {
    const relative = formatRelativeSync(lastUpdatedAt);
    const slowSuffix = showSlowRefreshHint ? " · Still working…" : " · Refreshing…";
    return {
      line: `Updated ${relative}${slowSuffix}`,
      showRetry: false,
    };
  }

  if (
    (stale && errorMessage) ||
    healthState === "refresh_failed_with_cache" ||
    healthState === "stale"
  ) {
    return {
      line: `Couldn't refresh · showing data from ${formatClockTime(lastUpdatedAt)}`,
      showRetry: true,
    };
  }

  if (healthState === "ready" || healthState === "refreshing") {
    return null;
  }

  return null;
}
