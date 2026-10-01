import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConnectError, connectAndContinue } from './connectAndContinue';

vi.mock('../platform/secureStorage', () => ({
  SECRET_KEYS: { JIRA_API_TOKEN: 'jira', BAMBOO_API_TOKEN: 'bamboo' },
  secureStoreSet: vi.fn(async () => undefined),
  secureStoreVerify: vi.fn(async () => ({ exists: true, readable: true, length: 8 })),
}));

const jiraTest = vi.fn();
vi.mock('../services/jira/jiraClient', () => ({
  JiraClient: vi.fn().mockImplementation(() => ({
    testConnection: jiraTest,
  })),
}));

const bambooTest = vi.fn();
const detectTeam = vi.fn();
vi.mock('../services/bamboo/bambooClient', () => ({
  BambooClient: vi.fn().mockImplementation(() => ({
    testConnection: bambooTest,
  })),
}));

vi.mock('../services/bamboo/teamDetection', () => ({
  detectTeam: (...args: unknown[]) => detectTeam(...args),
}));

const savePreferences = vi.fn(async () => undefined);
const loadPreferencesForMerge = vi.fn(async () => ({
  setup: { completed: false },
  workEmail: '',
  jiraIdentity: null,
  jiraBaseUrl: '',
  jiraEmail: '',
  bambooSubdomain: '',
  bambooWorkEmail: '',
  teamDetection: null,
  credentials: { jiraConfigured: false, bambooConfigured: false, migrationVersion: 0 },
}));
vi.mock('../platform/preferences', () => ({
  loadPreferencesForMerge: (...args: unknown[]) => loadPreferencesForMerge(...args),
  savePreferences: (...args: unknown[]) => savePreferences(...args),
  syncWorkEmailFields: (email: string) => ({
    workEmail: email,
    jiraEmail: email,
    bambooWorkEmail: email,
  }),
}));

const persistConnectionConfig = vi.fn(async () => undefined);
vi.mock('./connectionStorage', () => ({
  persistConnectionConfig: (...args: unknown[]) => persistConnectionConfig(...args),
}));

describe('connectAndContinue', () => {
  beforeEach(() => {
    jiraTest.mockReset();
    bambooTest.mockReset();
    detectTeam.mockReset();
    savePreferences.mockClear();
    persistConnectionConfig.mockClear();
  });

  it('rejects external email before API calls', async () => {
    await expect(
      connectAndContinue({
        workEmail: 'x@gmail.com',
        jiraToken: 't',
        bambooApiKey: 'k',
      }),
    ).rejects.toMatchObject({ field: 'workEmail' } satisfies Partial<ConnectError>);

    expect(jiraTest).not.toHaveBeenCalled();
  });

  it('persists preferences after successful verification', async () => {
    jiraTest.mockResolvedValue({
      accountId: 'acc',
      displayName: 'User',
      emailAddress: 'user@altenar.com',
    });
    bambooTest.mockResolvedValue({ ok: true });
    detectTeam.mockResolvedValue({
      ok: true,
      mode: 'personal',
      employee: {
        id: '1',
        displayName: 'User',
        workEmail: 'user@altenar.com',
        jobTitle: 'IC',
        status: 'active',
      },
      directReports: [],
      fullTeam: [],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'id',
      ambiguousSupervisorNames: 0,
    });

    await connectAndContinue({
      workEmail: 'user@altenar.com',
      jiraToken: 'token',
      bambooApiKey: 'key',
    });

    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        workEmail: 'user@altenar.com',
        setup: { completed: true },
      }),
    );
    expect(persistConnectionConfig).toHaveBeenCalledWith(
      { workEmail: 'user@altenar.com' },
      { jiraToken: 'token', bambooApiKey: 'key' },
    );
    expect(savePreferences.mock.invocationCallOrder[0]).toBeLessThan(
      persistConnectionConfig.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('does not mark the session connected during connectAndContinue', async () => {
    jiraTest.mockResolvedValue({
      accountId: 'acc',
      displayName: 'User',
      emailAddress: 'user@altenar.com',
    });
    bambooTest.mockResolvedValue({ ok: true });
    detectTeam.mockResolvedValue({
      ok: true,
      mode: 'personal',
      employee: {
        id: '1',
        displayName: 'User',
        workEmail: 'user@altenar.com',
        jobTitle: 'IC',
        status: 'active',
      },
      directReports: [],
      fullTeam: [],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'id',
      ambiguousSupervisorNames: 0,
    });

    await connectAndContinue({
      workEmail: 'user@altenar.com',
      jiraToken: 'token',
      bambooApiKey: 'key',
    });

    expect(persistConnectionConfig).toHaveBeenCalled();
  });
});
