import { getBuildBambooPortalUrl } from './product';

/** Official Atlassian API token management page. */
export const ATLASSIAN_API_TOKEN_URL = 'https://id.atlassian.com/manage-profile/security/api-tokens';

/** Direct BambooHR API key management page for the configured company portal. */
export function getBambooApiKeyHelpUrl(): string {
  const portal = getBuildBambooPortalUrl() || 'https://altenar.bamboohr.com';
  return `${portal.replace(/\/$/, '')}/app/settings/permissions/api_keys`;
}
