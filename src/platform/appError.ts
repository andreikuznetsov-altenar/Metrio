export type AppErrorAction = {
  label: string;
  action: 'reconnect-google' | 'open-settings' | 'retry' | 'custom';
};

export interface AppError {
  title: string;
  message: string;
  action?: AppErrorAction;
}

export function toAppError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('oauth') || lower.includes('authorization') || lower.includes('token')) {
    return {
      title: 'Google authorization expired',
      message: 'Reconnect your Google account to continue sending surveys and syncing responses.',
      action: { label: 'Reconnect', action: 'reconnect-google' },
    };
  }

  if (lower.includes('bamboo')) {
    return {
      title: 'BambooHR request failed',
      message: message,
      action: { label: 'Open Settings', action: 'open-settings' },
    };
  }

  if (lower.includes('jira')) {
    return {
      title: 'Jira request failed',
      message: message,
      action: { label: 'Retry', action: 'retry' },
    };
  }

  return { title: 'Something went wrong', message };
}
