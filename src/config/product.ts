import type { AppPreferences } from '../platform/preferences';
import { COMPANY_CONFIG } from './company';

/** Canonical product display name — use for all user-facing copy. */
export const PRODUCT_NAME = 'Metrio';

function envString(key: string): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Optional build-time Jira base URL override for developers and CI. */
export function getBuildJiraBaseUrl(): string {
  return envString('VITE_JIRA_BASE_URL');
}

/** Optional build-time Bamboo subdomain override for developers and CI. */
export function getBuildBambooSubdomain(): string {
  return envString('VITE_BAMBOO_SUBDOMAIN');
}

/** Optional explicit Bamboo portal URL override; otherwise derived from subdomain or company config. */
export function getBuildBambooPortalUrl(): string {
  const explicit = envString('VITE_BAMBOO_PORTAL_URL');
  if (explicit) return explicit;
  const subdomain = getBuildBambooSubdomain();
  if (subdomain) return `https://${subdomain}.bamboohr.com`;
  return COMPANY_CONFIG.bambooPortalUrl;
}

export function resolveJiraBaseUrl(prefs?: AppPreferences): string {
  return (
    getBuildJiraBaseUrl() ||
    prefs?.jiraBaseUrl?.trim() ||
    COMPANY_CONFIG.jiraBaseUrl
  );
}

export function resolveBambooSubdomain(prefs?: AppPreferences): string {
  return (
    getBuildBambooSubdomain() ||
    prefs?.bambooSubdomain?.trim() ||
    COMPANY_CONFIG.bambooSubdomain
  );
}

export function isJiraProductConfigured(prefs?: AppPreferences): boolean {
  return !!resolveJiraBaseUrl(prefs);
}

export function isBambooProductConfigured(prefs?: AppPreferences): boolean {
  return !!resolveBambooSubdomain(prefs);
}

/** Returns null when company Jira config is available (built-in or env override). */
export function getJiraConfigErrorMessage(): string | null {
  if (resolveJiraBaseUrl()) return null;
  const channel = import.meta.env.VITE_BUILD_CHANNEL || 'development';
  if (channel === 'development') {
    return 'Jira is not configured in this build.';
  }
  return 'Jira is not configured in this build. Contact your administrator.';
}

/** Returns null when company Bamboo config is available (built-in or env override). */
export function getBambooConfigErrorMessage(): string | null {
  if (resolveBambooSubdomain()) return null;
  const channel = import.meta.env.VITE_BUILD_CHANNEL || 'development';
  if (channel === 'development') {
    return 'BambooHR is not configured in this build.';
  }
  return 'BambooHR is not configured in this build. Contact your administrator.';
}

/** Merge resolved company config into preferences. */
export function applyProductConfig(prefs: AppPreferences): AppPreferences {
  const jiraBaseUrl = resolveJiraBaseUrl(prefs);
  const bambooSubdomain = resolveBambooSubdomain(prefs);
  const workEmail = prefs.workEmail || prefs.jiraEmail || prefs.bambooWorkEmail || '';
  return {
    ...prefs,
    jiraBaseUrl,
    bambooSubdomain,
    workEmail,
    jiraEmail: workEmail || prefs.jiraEmail,
    bambooWorkEmail: workEmail || prefs.bambooWorkEmail,
  };
}
