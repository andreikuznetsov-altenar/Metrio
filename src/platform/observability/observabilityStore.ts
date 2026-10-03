import type {
  ApiRequestCounts,
  AppLogRecord,
  IntegrationHealthSnapshot,
  IntegrationRefreshStatus,
  LogComponent,
  RefreshMetrics,
} from "./types";
import type { ErrorCategory } from "./types";

const MAX_RING = 120;
const logRing: AppLogRecord[] = [];

let refreshMetrics: RefreshMetrics = {
  refreshRequested: 0,
  refreshCoalesced: 0,
  refreshCompleted: 0,
  refreshFailed: 0,
};

const apiCounts: ApiRequestCounts = {
  jira: 0,
  bamboo: 0,
  confluence: 0,
  google: 0,
  backend: 0,
};

const integrations = new Map<LogComponent, IntegrationHealthSnapshot>();
const startupTimings: Record<string, number> = {};

export function recordStartupPhase(phase: string, durationMs: number): void {
  startupTimings[phase] = durationMs;
}

export function getStartupTimings(): Record<string, number> {
  return { ...startupTimings };
}

export function pushAppLogRecord(record: AppLogRecord): void {
  logRing.push(record);
  if (logRing.length > MAX_RING) {
    logRing.splice(0, logRing.length - MAX_RING);
  }
}

export function getRecentAppLogRecords(): AppLogRecord[] {
  return [...logRing];
}

export function incrementApiRequest(component: keyof ApiRequestCounts): void {
  apiCounts[component] += 1;
}

export function getApiRequestCounts(): ApiRequestCounts {
  return { ...apiCounts };
}

export function noteRefreshRequested(): void {
  refreshMetrics.refreshRequested += 1;
}

export function noteRefreshCoalesced(): void {
  refreshMetrics.refreshCoalesced += 1;
}

export function noteRefreshCompleted(): void {
  refreshMetrics.refreshCompleted += 1;
}

export function noteRefreshFailed(): void {
  refreshMetrics.refreshFailed += 1;
}

export function getRefreshMetrics(): RefreshMetrics {
  return { ...refreshMetrics };
}

export function updateIntegrationHealth(
  component: LogComponent,
  patch: Partial<IntegrationHealthSnapshot> & { label: string },
): void {
  const prev = integrations.get(component);
  integrations.set(component, {
    component,
    label: patch.label,
    connectionState: patch.connectionState ?? prev?.connectionState ?? "unavailable",
    lastRefreshAt: patch.lastRefreshAt ?? prev?.lastRefreshAt ?? null,
    lastRefreshStatus: patch.lastRefreshStatus ?? prev?.lastRefreshStatus ?? "never",
    lastDurationMs: patch.lastDurationMs ?? prev?.lastDurationMs ?? null,
    lastErrorCategory: patch.lastErrorCategory ?? prev?.lastErrorCategory ?? null,
    detail: patch.detail ?? prev?.detail,
  });
}

export function recordIntegrationRefresh(
  component: LogComponent,
  label: string,
  status: IntegrationRefreshStatus,
  durationMs: number,
  errorCategory?: ErrorCategory | null,
  detail?: string,
): void {
  updateIntegrationHealth(component, {
    label,
    connectionState:
      status === "failed" ? "unavailable" : status === "partial" ? "permission_limited" : "connected",
    lastRefreshAt: new Date().toISOString(),
    lastRefreshStatus: status,
    lastDurationMs: durationMs,
    lastErrorCategory: errorCategory ?? null,
    detail,
  });
}

export function getIntegrationHealthSnapshots(): IntegrationHealthSnapshot[] {
  return [...integrations.values()];
}

export function resetRecreatableCaches(): void {
  try {
    sessionStorage.removeItem("metrio-calendar-cache-v1");
  } catch {
    /* ignore */
  }
}
