/** Built-in Altenar integration endpoints — not secrets; single source of truth for auth phase. */
export const COMPANY_CONFIG = {
  jiraBaseUrl: "https://altenar.atlassian.net",
  bambooSubdomain: "altenar",
  bambooPortalUrl: "https://altenar.bamboohr.com",
  companyWebsiteUrl: "https://altenar.com",
} as const;

export const JIRA_BASE_URL = COMPANY_CONFIG.jiraBaseUrl;
export const BAMBOO_SUBDOMAIN = COMPANY_CONFIG.bambooSubdomain;
export const BAMBOO_BASE_URL = COMPANY_CONFIG.bambooPortalUrl;
