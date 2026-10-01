/** No-op telemetry interface for future non-PII event capture. */

export type TelemetryEvent =
  | 'app_started'
  | 'sync_failed'
  | 'survey_prepared'
  | 'report_cancelled';

export function trackEvent(_event: TelemetryEvent, _properties?: Record<string, string | number | boolean>) {
  // Intentionally disabled for internal beta — no external vendor transmission.
}
