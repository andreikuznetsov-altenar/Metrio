import type { FeedbackSurveyTemplate } from "../feedbackCycles/feedbackCycleTypes";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";
import type { OnboardingResourceGroup } from "../onboarding/resourceTypes";
import type { ChecklistItemDefinition } from "../../config/onboardingChecklistDefinitions";

export const COMPANY_CONFIG_SCHEMA_VERSION = 1;

export type ManagedSettingPolicy = "managed" | "user-overridable" | "user-only";

export type CompanyResourceTargetConfig =
  | { kind: "external"; url: string }
  | { kind: "bamboo_portal" }
  | { kind: "jira_project_key"; projectKey: string }
  | { kind: "confluence_space_key"; spaceKey: string; url: string };

export interface CompanyIdentity {
  displayName: string;
  logoUrl?: string;
  supportUrl?: string;
  internalPortalUrl?: string;
}

export interface IntegrationConfig {
  atlassianBaseUrl?: string;
  bambooSubdomain?: string;
  bambooPortalUrl?: string;
  allowedUrlHostPatterns?: string[];
}

export interface DepartmentConfig {
  id: string;
  bambooDepartmentKey: string;
  displayName?: string;
  resourceIds?: string[];
  checklistItemIds?: string[];
  suggestedJiraProjectKeys?: string[];
}

export interface TeamConfig {
  id: string;
  label: string;
}

export interface CompanyResourceConfig {
  id: string;
  title: string;
  description?: string;
  group: OnboardingResourceGroup;
  audience: "company" | "department" | "team" | "location" | "role_context" | "project";
  audienceKey?: string;
  source: "curated" | "jira" | "confluence" | "bamboo";
  priority: number;
  tags?: string[];
  jobTitleHints?: string[];
  target: CompanyResourceTargetConfig;
}

export interface OnboardingCompanyConfig {
  newStarterDays: number;
  feedbackOnboardingDays: number[];
  checklistItems: ChecklistItemDefinition[];
}

export interface FeedbackCompanyConfig {
  templates: FeedbackSurveyTemplate[];
}

export interface OperationalDefaultsConfig {
  rules: OperationalRules;
  managedFields: Record<string, ManagedSettingPolicy>;
}

export interface FeatureFlags {
  confluence: boolean;
  feedback: boolean;
  goals: boolean;
  onboarding: boolean;
  directorOrganization: boolean;
  projectCockpit: boolean;
}

export interface AccessPolicy {
  /**
   * Hints for UI only — must not be sole authorization for sensitive org data.
   * Trusted backend validation required for production org scope.
   */
  organizationScopeAllowlist?: { employeeIds?: string[]; emails?: string[] };
  companyAdmins?: { employeeIds?: string[]; emails?: string[] };
}

export interface CompanyConfig {
  schemaVersion: number;
  configVersion: string;
  updatedAt: string;
  company: CompanyIdentity;
  integrations: IntegrationConfig;
  departments: DepartmentConfig[];
  teams: TeamConfig[];
  resources: CompanyResourceConfig[];
  onboarding: OnboardingCompanyConfig;
  feedback: FeedbackCompanyConfig;
  defaults: OperationalDefaultsConfig;
  features: FeatureFlags;
  accessPolicy: AccessPolicy;
}

export interface CompanyConfigHistoryEntry {
  configVersion: string;
  updatedAt: string;
  summary?: string;
}

export interface CompanyConfigCacheFile {
  schemaVersion: number;
  active: CompanyConfig;
  history: CompanyConfigHistoryEntry[];
  lastRemoteFetchAt?: string | null;
  lastRemoteError?: string | null;
}

export interface ConfigValidationResult {
  ok: boolean;
  errors: string[];
  config?: CompanyConfig;
}
