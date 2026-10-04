import { format, parseISO } from "date-fns";
import { formatRelativeSync } from "../../platform/observability/connectionDiagnostics";

export interface DashboardSyncStatusInput {
  lastUpdatedAt: string | null;
  refreshing: boolean;
  stale: boolean;
  errorMessage: string | null;
}

export interface DashboardSyncStatus {
  line: string;
  showRetry: boolean;
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
  const { lastUpdatedAt, refreshing, stale, errorMessage } = input;
  if (!lastUpdatedAt) return null;

  if (refreshing) {
    const relative = formatRelativeSync(lastUpdatedAt);
    return {
      line: `Updated ${relative} · Refreshing…`,
      showRetry: false,
    };
  }

  if (stale && errorMessage) {
    return {
      line: `Couldn't refresh · showing data from ${formatClockTime(lastUpdatedAt)}`,
      showRetry: true,
    };
  }

  return null;
}
