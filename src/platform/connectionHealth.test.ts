import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from './preferences';
import {
  formatConnectionAttentionMessage,
  getIntegrationConnectionState,
  getPerformanceConnectionAttention,
  summarizeConnectionHealth,
} from './connectionHealth';

const basePrefs = {
  ...DEFAULT_PREFERENCES,
  setup: { completed: true },
  workEmail: 'user@altenar.com',
  jiraIdentity: {
    accountId: '1',
    displayName: 'User',
    emailAddress: 'user@altenar.com',
    verification: 'verified_email' as const,
  },
  teamDetection: {
    ok: true,
    mode: 'team' as const,
    directReports: [],
    fullTeam: [],
    missingFields: [],
    restrictedFields: [],
    diagnostics: [],
    reportingSource: 'id' as const,
    ambiguousSupervisorNames: 0,
  },
  credentials: {
    jiraConfigured: true,
    bambooConfigured: true,
    migrationVersion: 1,
  },
};

const baseInput = {
  prefs: basePrefs,
  hasJiraToken: true,
  hasBambooToken: true,
};

describe('summarizeConnectionHealth', () => {
  it('returns Connected only after successful verification', () => {
    const summary = summarizeConnectionHealth({
      ...baseInput,
      jiraStatus: 'connected',
      bambooStatus: 'connected',
    });
    expect(summary.level).toBe('ok');
    expect(summary.headerLabel).toBe('Connected');
    expect(summary.issues).toEqual([]);
  });

  it('returns Needs attention when configured but not yet verified', () => {
    const summary = summarizeConnectionHealth({
      ...baseInput,
      jiraStatus: 'idle',
      bambooStatus: 'idle',
    });
    expect(summary.level).toBe('attention');
    expect(summary.headerLabel).toBe('Needs attention');
    expect(summary.issues).toEqual(['Jira', 'Bamboo']);
  });

  it('returns Needs attention when Jira verified but Bamboo errors', () => {
    const summary = summarizeConnectionHealth({
      ...baseInput,
      jiraStatus: 'connected',
      bambooStatus: 'error',
    });
    expect(summary.level).toBe('attention');
    expect(summary.headerLabel).toBe('Needs attention');
    expect(summary.issues).toEqual(['Bamboo']);
  });

  it('returns Needs attention when Bamboo verified but Jira errors', () => {
    const summary = summarizeConnectionHealth({
      ...baseInput,
      jiraStatus: 'error',
      bambooStatus: 'connected',
    });
    expect(summary.level).toBe('attention');
    expect(summary.headerLabel).toBe('Needs attention');
    expect(summary.issues).toEqual(['Jira']);
  });

  it('returns Needs attention when setup completed but Jira is not configured', () => {
    const summary = summarizeConnectionHealth({
      prefs: {
        ...basePrefs,
        credentials: { ...basePrefs.credentials, jiraConfigured: false },
      },
      jiraStatus: 'idle',
      bambooStatus: 'connected',
      hasJiraToken: false,
      hasBambooToken: true,
    });
    expect(summary.level).toBe('attention');
    expect(summary.headerLabel).toBe('Needs attention');
    expect(summary.headerLabel).not.toBe('Connected');
  });

  it('returns Offline when neither credential is configured', () => {
    const summary = summarizeConnectionHealth({
      ...baseInput,
      jiraStatus: 'idle',
      bambooStatus: 'idle',
      hasJiraToken: false,
      hasBambooToken: false,
    });
    expect(summary.level).toBe('offline');
    expect(summary.headerLabel).toBe('Offline');
  });
});

describe('formatConnectionAttentionMessage', () => {
  it('uses Jira-specific copy for Jira-only issues', () => {
    expect(formatConnectionAttentionMessage(['Jira'])).toBe('Jira connection needs attention.');
  });

  it('uses Bamboo-specific copy for Bamboo-only issues', () => {
    expect(formatConnectionAttentionMessage(['Bamboo'])).toBe('BambooHR connection needs attention.');
  });

  it('uses plural copy when both integrations need attention', () => {
    expect(formatConnectionAttentionMessage(['Jira', 'Bamboo'])).toBe('Connections need attention.');
  });
});

describe('getPerformanceConnectionAttention', () => {
  it('shows Bamboo attention when Jira is verified and Bamboo errors', () => {
    const attention = getPerformanceConnectionAttention({
      ...baseInput,
      teamDetectionOk: true,
      jiraStatus: 'connected',
      bambooStatus: 'error',
    });
    expect(attention?.show).toBe(true);
    expect(attention?.message).toBe('BambooHR connection needs attention.');
    expect(attention?.reconnectPath).toBe('/settings/connections');
  });

  it('shows Jira attention when Bamboo is verified and Jira errors', () => {
    const attention = getPerformanceConnectionAttention({
      ...baseInput,
      teamDetectionOk: true,
      jiraStatus: 'error',
      bambooStatus: 'connected',
    });
    expect(attention?.message).toBe('Jira connection needs attention.');
  });

  it('returns null when both integrations are verified', () => {
    const attention = getPerformanceConnectionAttention({
      ...baseInput,
      teamDetectionOk: true,
      jiraStatus: 'connected',
      bambooStatus: 'connected',
    });
    expect(attention).toBeNull();
  });

  it('does not show reconnect attention when Jira is connected but data is stale', () => {
    const attention = getPerformanceConnectionAttention({
      ...baseInput,
      prefs: {
        ...basePrefs,
        sync: { ...basePrefs.sync, jiraStale: true },
      },
      teamDetectionOk: true,
      jiraStatus: 'connected',
      bambooStatus: 'connected',
    });
    expect(attention).toBeNull();
  });

  it('shows attention after cold launch until verification completes', () => {
    const attention = getPerformanceConnectionAttention({
      ...baseInput,
      teamDetectionOk: true,
      jiraStatus: 'idle',
      bambooStatus: 'idle',
    });
    expect(attention?.message).toBe('Connections need attention.');
  });
});

describe('getIntegrationConnectionState', () => {
  it('keeps connected state when sync data is stale', () => {
    expect(
      getIntegrationConnectionState('Jira', {
        ...baseInput,
        prefs: {
          ...basePrefs,
          sync: { ...basePrefs.sync, jiraStale: true },
        },
        jiraStatus: 'connected',
        bambooStatus: 'connected',
      }),
    ).toBe('connected');
  });

  it('treats configured-but-idle as attention, not connected', () => {
    expect(
      getIntegrationConnectionState('Jira', {
        ...baseInput,
        jiraStatus: 'idle',
        bambooStatus: 'connected',
      }),
    ).toBe('attention');
  });
});
