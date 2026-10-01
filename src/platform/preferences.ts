import { invoke } from '@tauri-apps/api/core';
import type { TeamDetectionResult } from '../services/bamboo/teamDetection';
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  normalizeWorkloadThresholds,
  type WorkloadThresholds,
} from '../domain/workload/workloadEngine';
import { applyProductConfig } from '../config/product';
import type { JiraEmailVerification } from '../domain/setup/jiraIdentity';

export const PREFERENCES_SCHEMA_VERSION = 6;

export interface StoredJiraIdentity {
  accountId: string;
  displayName: string;
  emailAddress: string;
  verification: JiraEmailVerification | 'unverified';
}

export interface SyncMetadata {
  lastBambooSync: string | null;
  lastJiraSync: string | null;
  lastSnapshotAt: string | null;
  bambooStale: boolean;
  jiraStale: boolean;
}

export interface NotificationState {
  workloadLevels: Record<string, string>;
  vacationNotified: Record<string, string>;
  problematicCounts: Record<string, number>;
}

export interface AppPreferences {
  schemaVersion: number;
  setup: {
    completed: boolean;
  };
  workEmail: string;
  jiraIdentity: StoredJiraIdentity | null;
  jiraBaseUrl: string;
  jiraEmail: string;
  bambooSubdomain: string;
  bambooWorkEmail: string;
  reportFilters: {
    dateFrom: string;
    dateTo: string;
    targetReviewDays: number;
    projects: string[];
    teamScope: 'full' | 'direct';
  };
  teamDetection: TeamDetectionResult | null;
  workloadThresholds: WorkloadThresholds;
  sync: SyncMetadata;
  notificationState: NotificationState;
  notifications: {
    vacationStarts: boolean;
    vacationReminder: boolean;
    returns: boolean;
    workloadAlerts: boolean;
    problematicTaskAlerts: boolean;
  };
  general: {
    keepRunningInTray: boolean;
    launchAtLogin: boolean;
  };
  credentials: {
    jiraConfigured: boolean;
    bambooConfigured: boolean;
    migrationVersion: number;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    displayTimezone: string;
    hideFractionalTimezones: boolean;
  };
  google: {
    accountEmail: string;
    formsConnected: boolean;
    gmailConnected: boolean;
    appsScriptWebAppUrl: string;
    oauthClientId: string;
    emailCollectionMode: 'VERIFIED' | 'RESPONDER_INPUT';
    responseAccess: 'restricted' | 'anyone_with_link';
  };
  beta: {
    feedbackUrl: string;
  };
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  schemaVersion: PREFERENCES_SCHEMA_VERSION,
  setup: { completed: false },
  workEmail: '',
  jiraIdentity: null,
  jiraBaseUrl: '',
  jiraEmail: '',
  bambooSubdomain: '',
  bambooWorkEmail: '',
  reportFilters: {
    dateFrom: '',
    dateTo: '',
    targetReviewDays: 3,
    projects: [],
    teamScope: 'full',
  },
  teamDetection: null,
  workloadThresholds: DEFAULT_WORKLOAD_THRESHOLDS,
  sync: {
    lastBambooSync: null,
    lastJiraSync: null,
    lastSnapshotAt: null,
    bambooStale: false,
    jiraStale: false,
  },
  notificationState: {
    workloadLevels: {},
    vacationNotified: {},
    problematicCounts: {},
  },
  notifications: {
    vacationStarts: true,
    vacationReminder: true,
    returns: true,
    workloadAlerts: true,
    problematicTaskAlerts: true,
  },
  general: {
    keepRunningInTray: true,
    launchAtLogin: false,
  },
  credentials: {
    jiraConfigured: false,
    bambooConfigured: false,
    migrationVersion: 0,
  },
  appearance: {
    theme: 'system',
    displayTimezone: 'system',
    hideFractionalTimezones: false,
  },
  google: {
    accountEmail: '',
    formsConnected: false,
    gmailConnected: false,
    appsScriptWebAppUrl: '',
    oauthClientId: '',
    emailCollectionMode: 'RESPONDER_INPUT',
    responseAccess: 'anyone_with_link',
  },
  beta: {
    feedbackUrl: '',
  },
};

export function getWorkEmail(prefs: Pick<AppPreferences, 'workEmail' | 'jiraEmail' | 'bambooWorkEmail'>): string {
  return (prefs.workEmail || prefs.jiraEmail || prefs.bambooWorkEmail || '').trim();
}

export function syncWorkEmailFields(workEmail: string): Pick<AppPreferences, 'workEmail' | 'jiraEmail' | 'bambooWorkEmail'> {
  const email = workEmail.trim();
  return { workEmail: email, jiraEmail: email, bambooWorkEmail: email };
}

export function migratePreferences(raw: Partial<AppPreferences> & { schemaVersion?: number }): AppPreferences {
  const version = raw.schemaVersion ?? 0;
  const merged: AppPreferences = {
    ...DEFAULT_PREFERENCES,
    ...raw,
    setup: { ...DEFAULT_PREFERENCES.setup, ...raw.setup },
    jiraIdentity: raw.jiraIdentity ?? null,
    workloadThresholds: normalizeWorkloadThresholds(raw.workloadThresholds),
    sync: { ...DEFAULT_PREFERENCES.sync, ...raw.sync },
    notificationState: { ...DEFAULT_PREFERENCES.notificationState, ...raw.notificationState },
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...raw.notifications },
    general: { ...DEFAULT_PREFERENCES.general, ...raw.general },
    appearance: { ...DEFAULT_PREFERENCES.appearance, ...raw.appearance },
    credentials: { ...DEFAULT_PREFERENCES.credentials, ...raw.credentials },
    google: { ...DEFAULT_PREFERENCES.google, ...raw.google },
    reportFilters: { ...DEFAULT_PREFERENCES.reportFilters, ...raw.reportFilters },
    beta: { ...DEFAULT_PREFERENCES.beta, ...raw.beta },
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
  };

  if (!merged.workEmail) {
    merged.workEmail = merged.jiraEmail || merged.bambooWorkEmail || '';
  }
  if (merged.workEmail) {
    merged.jiraEmail = merged.workEmail;
    merged.bambooWorkEmail = merged.workEmail;
  }

  if (version < 1) {
    const legacyComplete =
      !!merged.jiraBaseUrl &&
      !!merged.jiraEmail &&
      !!merged.bambooSubdomain &&
      !!merged.bambooWorkEmail &&
      !!merged.teamDetection?.ok;
    if (legacyComplete) {
      merged.setup.completed = true;
    }
  }

  // Legacy v4 migration: preserve "configured" metadata for completed installs so users
  // are not forced through first-run again. This is compatibility metadata only — it is
  // NOT proof that Keychain credentials exist and must never be treated as verified.
  // Verified connection state comes only from successful integration tests at runtime.
  if (version < 4) {
    if (merged.setup.completed) {
      merged.credentials = {
        ...merged.credentials,
        jiraConfigured: true,
        bambooConfigured: true,
        migrationVersion: Math.max(merged.credentials.migrationVersion, 1),
      };
    }
  }

  if (version < 2 && merged.setup.completed && !merged.jiraIdentity && merged.teamDetection?.employee) {
    merged.jiraIdentity = {
      accountId: '',
      displayName: merged.teamDetection.employee.displayName,
      emailAddress: merged.jiraEmail,
      verification: 'unverified',
    };
  }

  if (version < 5) {
    merged.appearance = {
      ...merged.appearance,
      displayTimezone: merged.appearance.displayTimezone || 'system',
      hideFractionalTimezones: merged.appearance.hideFractionalTimezones ?? false,
    };
  }

  if (version < 6) {
    merged.google = {
      ...merged.google,
      appsScriptWebAppUrl: merged.google.appsScriptWebAppUrl || '',
    };
  }

  return applyProductConfig(merged);
}

export async function loadPreferences(): Promise<AppPreferences> {
  try {
    const data = await invoke<Partial<AppPreferences>>('preferences_load');
    return migratePreferences(data);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function savePreferences(prefs: AppPreferences): Promise<void> {
  await invoke('preferences_save', {
    preferences: { ...prefs, schemaVersion: PREFERENCES_SCHEMA_VERSION },
  });
}

export async function loadStorageWarnings(): Promise<string[]> {
  try {
    return await invoke<string[]>('storage_get_warnings');
  } catch {
    return [];
  }
}
