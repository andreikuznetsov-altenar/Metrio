import { describe, expect, it } from 'vitest';
import { COMPANY_CONFIG } from './company';
import {
  applyProductConfig,
  getBambooConfigErrorMessage,
  getBuildBambooPortalUrl,
  getBuildJiraBaseUrl,
  getJiraConfigErrorMessage,
  resolveBambooSubdomain,
  resolveJiraBaseUrl,
} from './product';
import { getBambooApiKeyHelpUrl } from './links';
import { DEFAULT_PREFERENCES } from '../platform/preferences';
import { validateConnectInput } from '../domain/setup/validation';

const emptyCompanyPrefs = {
  ...DEFAULT_PREFERENCES,
  jiraBaseUrl: '',
  bambooSubdomain: '',
};

describe('company config', () => {
  it('uses built-in Jira URL without env or prefs', () => {
    expect(getBuildJiraBaseUrl()).toBe('');
    expect(resolveJiraBaseUrl(emptyCompanyPrefs)).toBe(COMPANY_CONFIG.jiraBaseUrl);
    expect(resolveJiraBaseUrl(emptyCompanyPrefs)).toBe('https://altenar.atlassian.net');
  });

  it('uses built-in Bamboo subdomain without env or prefs', () => {
    expect(resolveBambooSubdomain(emptyCompanyPrefs)).toBe(COMPANY_CONFIG.bambooSubdomain);
    expect(resolveBambooSubdomain(emptyCompanyPrefs)).toBe('altenar');
  });

  it('uses built-in Bamboo portal URL without env', () => {
    expect(getBuildBambooPortalUrl()).toBe(COMPANY_CONFIG.bambooPortalUrl);
    expect(getBambooApiKeyHelpUrl()).toBe(
      'https://altenar.bamboohr.com/app/settings/permissions/api_keys',
    );
  });

  it('env override takes precedence over built-in Jira URL when set at build time', () => {
    const envUrl = import.meta.env.VITE_JIRA_BASE_URL;
    if (typeof envUrl === 'string' && envUrl.trim()) {
      expect(resolveJiraBaseUrl(emptyCompanyPrefs)).toBe(envUrl.trim());
    } else {
      expect(resolveJiraBaseUrl(emptyCompanyPrefs)).toBe(COMPANY_CONFIG.jiraBaseUrl);
    }
  });

  it('env override takes precedence over built-in Bamboo subdomain when set at build time', () => {
    const envSubdomain = import.meta.env.VITE_BAMBOO_SUBDOMAIN;
    if (typeof envSubdomain === 'string' && envSubdomain.trim()) {
      expect(resolveBambooSubdomain(emptyCompanyPrefs)).toBe(envSubdomain.trim());
    } else {
      expect(resolveBambooSubdomain(emptyCompanyPrefs)).toBe(COMPANY_CONFIG.bambooSubdomain);
    }
  });

  it('developer prefs override beats built-in company config', () => {
    expect(
      resolveJiraBaseUrl({ ...emptyCompanyPrefs, jiraBaseUrl: 'https://sandbox.atlassian.net' }),
    ).toBe('https://sandbox.atlassian.net');
    expect(resolveBambooSubdomain({ ...emptyCompanyPrefs, bambooSubdomain: 'sandbox' })).toBe('sandbox');
  });

  it('does not block onboarding when built-in company config is present', () => {
    expect(getJiraConfigErrorMessage()).toBeNull();
    expect(getBambooConfigErrorMessage()).toBeNull();
  });

  it('syncs work email fields in applyProductConfig', () => {
    const prefs = applyProductConfig({
      ...DEFAULT_PREFERENCES,
      workEmail: 'user@altenar.com',
    });
    expect(prefs.jiraEmail).toBe('user@altenar.com');
    expect(prefs.bambooWorkEmail).toBe('user@altenar.com');
    expect(prefs.jiraBaseUrl).toBe(COMPANY_CONFIG.jiraBaseUrl);
    expect(prefs.bambooSubdomain).toBe(COMPANY_CONFIG.bambooSubdomain);
  });

  it('setup requires only work email and two credentials', () => {
    expect(
      validateConnectInput({
        workEmail: 'user@altenar.com',
        jiraToken: 'jira-token',
        bambooApiKey: 'bamboo-key',
      }),
    ).toBeNull();
    expect(
      validateConnectInput({ workEmail: '', jiraToken: 'jira-token', bambooApiKey: 'bamboo-key' }),
    ).toContain('@altenar.com');
  });
});
