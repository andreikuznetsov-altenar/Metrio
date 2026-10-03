export type LogComponent =
  | "app"
  | "auth"
  | "jira"
  | "bamboo"
  | "confluence"
  | "google"
  | "feedback"
  | "backend"
  | "tray"
  | "notifications"
  | "updater"
  | "storage"
  | "calendar";

export type ErrorCategory =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "rate_limit"
  | "not_found"
  | "invalid_response"
  | "storage"
  | "configuration"
  | "internal"
  | "offline";

export type IntegrationRefreshStatus = "success" | "failed" | "partial" | "never";

export interface IntegrationHealthSnapshot {
  component: LogComponent;
  label: string;
  connectionState:
    | "connected"
    | "permission_limited"
    | "authentication_required"
    | "unavailable"
    | "not_configured";
  lastRefreshAt: string | null;
  lastRefreshStatus: IntegrationRefreshStatus;
  lastDurationMs: number | null;
  lastErrorCategory: ErrorCategory | null;
  detail?: string;
}

export interface RefreshMetrics {
  refreshRequested: number;
  refreshCoalesced: number;
  refreshCompleted: number;
  refreshFailed: number;
}

export interface ApiRequestCounts {
  jira: number;
  bamboo: number;
  confluence: number;
  google: number;
  backend: number;
}

export interface AppLogRecord {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  component: LogComponent;
  event: string;
  result?: "ok" | "error" | "partial";
  durationMs?: number;
  errorCategory?: ErrorCategory;
  correlationId?: string;
  safeMetadata?: Record<string, string | number | boolean>;
}
