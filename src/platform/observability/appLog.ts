import { writeLog, type LogDomain, type LogLevel } from "../logger";
import { loadPreferences } from "../preferences";
import { categorizeError } from "./errorCategory";
import { pushAppLogRecord } from "./observabilityStore";
import type { AppLogRecord, LogComponent } from "./types";

function componentToDomain(component: LogComponent): LogDomain {
  if (component === "jira") return "jira";
  if (component === "bamboo") return "bamboo";
  if (component === "google" || component === "calendar") return "google";
  if (component === "feedback") return "survey";
  if (component === "tray") return "tray";
  if (component === "notifications") return "scheduler";
  return "app";
}

export async function recordAppLog(
  input: Omit<AppLogRecord, "timestamp"> & { timestamp?: string },
): Promise<void> {
  const prefs = await loadPreferences().catch(() => null);
  if (input.level === "debug" && !prefs?.diagnostics.debugLoggingEnabled) {
    return;
  }

  const record: AppLogRecord = {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  pushAppLogRecord(record);

  const metadata = record.safeMetadata
    ? ` ${JSON.stringify(record.safeMetadata)}`
    : "";
  const message = `event=${record.event} result=${record.result ?? "-"} durationMs=${record.durationMs ?? "-"} category=${record.errorCategory ?? "-"}${metadata}`;

  await writeLog(
    record.level as LogLevel,
    componentToDomain(record.component),
    record.event,
    message,
    record.correlationId,
  );
}

export async function recordAppLogError(
  component: LogComponent,
  event: string,
  error: unknown,
  correlationId?: string,
  durationMs?: number,
): Promise<void> {
  await recordAppLog({
    level: "error",
    component,
    event,
    result: "error",
    errorCategory: categorizeError(error),
    correlationId,
    durationMs,
  });
}
