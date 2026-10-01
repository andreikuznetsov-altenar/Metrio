import { invoke } from '@tauri-apps/api/core';
import { sanitizeLogMessage } from './logSanitize';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogDomain =
  | 'app'
  | 'jira'
  | 'bamboo'
  | 'google'
  | 'survey'
  | 'scheduler'
  | 'tray';

export async function writeLog(
  level: LogLevel,
  domain: LogDomain,
  operation: string,
  message: string,
  correlationId?: string,
): Promise<void> {
  try {
    await invoke('log_write', {
      params: {
        level,
        domain,
        operation,
        correlation_id: correlationId || null,
        message: sanitizeLogMessage(message),
      },
    });
  } catch {
    // Logging must never break user flows.
  }
}

export async function openLogsFolder(): Promise<void> {
  await invoke('logs_open_folder');
}

export async function getLogsPath(): Promise<string> {
  const result = await invoke<{ path: string }>('logs_get_path');
  return result.path;
}
