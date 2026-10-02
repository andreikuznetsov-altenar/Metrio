import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, getWorkEmail, migratePreferences, syncWorkEmailFields } from './preferences';

describe('preferences migration', () => {
  it('adds schemaVersion for legacy files', () => {
    const migrated = migratePreferences({ jiraBaseUrl: 'https://x.atlassian.net' });
    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.setup.completed).toBe(false);
  });

  it('marks setup completed for legacy fully configured installs', () => {
    const migrated = migratePreferences({
      jiraBaseUrl: 'https://x.atlassian.net',
      jiraEmail: 'user@co.com',
      bambooSubdomain: 'co',
      bambooWorkEmail: 'manager@co.com',
      teamDetection: {
        ok: true,
        mode: 'team',
        directReports: [],
        fullTeam: [],
        missingFields: [],
        restrictedFields: [],
        diagnostics: [],
        reportingSource: 'id',
        ambiguousSupervisorNames: 0,
      },
    });
    expect(migrated.setup.completed).toBe(true);
  });

  it('does not force first-run for completed legacy users', () => {
    const migrated = migratePreferences({
      schemaVersion: 1,
      setup: { completed: true },
      jiraEmail: 'legacy@co.com',
      bambooWorkEmail: 'legacy@co.com',
    });
    expect(migrated.setup.completed).toBe(true);
  });

  it('syncs one work email to jira and bamboo fields', () => {
    const synced = syncWorkEmailFields('one@altenar.com');
    expect(synced.workEmail).toBe('one@altenar.com');
    expect(synced.jiraEmail).toBe('one@altenar.com');
    expect(synced.bambooWorkEmail).toBe('one@altenar.com');
  });

  it('reads work email from legacy separate fields', () => {
    const email = getWorkEmail({
      workEmail: '',
      jiraEmail: 'jira@co.com',
      bambooWorkEmail: 'bamboo@co.com',
    });
    expect(email).toBe('jira@co.com');
  });

  it('preserves defaults for missing fields', () => {
    const migrated = migratePreferences({});
    expect(migrated.general.keepRunningInTray).toBe(DEFAULT_PREFERENCES.general.keepRunningInTray);
  });

  it('defaults appearance theme to system', () => {
    const migrated = migratePreferences({});
    expect(migrated.appearance.theme).toBe('system');
  });

  it('defaults display timezone preferences for legacy files', () => {
    const migrated = migratePreferences({ schemaVersion: 4, appearance: { theme: 'dark' } });
    expect(migrated.appearance.displayTimezone).toBe('system');
    expect(migrated.appearance.hideFractionalTimezones).toBe(false);
    expect(migrated.schemaVersion).toBe(8);
  });

  it('adds Apps Script web app URL for legacy google prefs', () => {
    const migrated = migratePreferences({
      schemaVersion: 5,
      google: {
        accountEmail: 'user@company.com',
        formsConnected: true,
        gmailConnected: true,
        oauthClientId: '',
        emailCollectionMode: 'RESPONDER_INPUT',
        responseAccess: 'anyone_with_link',
      },
    });
    expect(migrated.google.appsScriptWebAppUrl).toBe('');
    expect(migrated.schemaVersion).toBe(8);
  });

  it('marks credentials configured for completed legacy setups without keychain reads', () => {
    const migrated = migratePreferences({
      schemaVersion: 3,
      setup: { completed: true },
    });
    expect(migrated.credentials.jiraConfigured).toBe(true);
    expect(migrated.credentials.bambooConfigured).toBe(true);
    expect(migrated.credentials.migrationVersion).toBe(1);
  });

  it('does not infer credential flags from work email or identity alone', () => {
    const migrated = migratePreferences({
      schemaVersion: 4,
      setup: { completed: true },
      workEmail: 'user@altenar.com',
      jiraIdentity: {
        accountId: '1',
        displayName: 'User',
        emailAddress: 'user@altenar.com',
        verification: 'verified_email',
      },
      teamDetection: {
        ok: true,
        mode: 'team',
        directReports: [],
        fullTeam: [],
        missingFields: [],
        restrictedFields: [],
        diagnostics: [],
        reportingSource: 'id',
        ambiguousSupervisorNames: 0,
      },
      credentials: {
        jiraConfigured: false,
        bambooConfigured: false,
        migrationVersion: 1,
      },
    });
    expect(migrated.credentials.jiraConfigured).toBe(false);
    expect(migrated.credentials.bambooConfigured).toBe(false);
  });
});
