import { COMPANY_CONFIG } from "../../config/company";
import { CURATED_ONBOARDING_RESOURCES } from "../../config/onboardingResources";
import { ONBOARDING_CHECKLIST_DEFINITIONS } from "../../config/onboardingChecklistDefinitions";
import { BUILTIN_FEEDBACK_TEMPLATES } from "../feedbackCycles/feedbackTemplates";
import { DEFAULT_OPERATIONAL_RULES } from "../operationalRules/operationalRulesDefaults";
import { DEFAULT_WORKFLOW_MAPPINGS } from "../workflows/defaultWorkflowMappings";
import type { CompanyConfig, CompanyResourceConfig } from "./companyConfigTypes";
import { COMPANY_CONFIG_SCHEMA_VERSION } from "./companyConfigTypes";

function mapResources(): CompanyResourceConfig[] {
  return CURATED_ONBOARDING_RESOURCES.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    group: def.group,
    audience: def.audience,
    audienceKey: def.audienceKey,
    source: def.source,
    priority: def.priority,
    tags: def.tags,
    jobTitleHints: def.jobTitleHints,
    target: def.target,
  }));
}

/** Builtin company config — preserves Phase 26/36/35/31 behavior. */
export function buildDefaultCompanyConfig(now = new Date()): CompanyConfig {
  return {
    schemaVersion: COMPANY_CONFIG_SCHEMA_VERSION,
    configVersion: "builtin-1",
    updatedAt: now.toISOString(),
    company: {
      displayName: "Altenar",
      supportUrl: COMPANY_CONFIG.bambooPortalUrl,
      internalPortalUrl: COMPANY_CONFIG.bambooPortalUrl,
    },
    integrations: {
      atlassianBaseUrl: COMPANY_CONFIG.jiraBaseUrl,
      bambooSubdomain: COMPANY_CONFIG.bambooSubdomain,
      bambooPortalUrl: COMPANY_CONFIG.bambooPortalUrl,
      allowedUrlHostPatterns: [
        "atlassian.net",
        "bamboohr.com",
      ],
    },
    departments: [
      {
        id: "dept-design",
        bambooDepartmentKey: "design",
        displayName: "Design",
        resourceIds: ["design-handbook", "design-jira"],
        checklistItemIds: ["design-handbook-read"],
        suggestedJiraProjectKeys: ["UX"],
      },
      {
        id: "dept-engineering",
        bambooDepartmentKey: "engineering",
        displayName: "Engineering",
        resourceIds: ["engineering-handbook", "engineering-workflow"],
        checklistItemIds: ["engineering-handbook-read"],
      },
    ],
    teams: [],
    resources: mapResources(),
    onboarding: {
      newStarterDays: 60,
      feedbackOnboardingDays: [14, 30, 60],
      checklistItems: [...ONBOARDING_CHECKLIST_DEFINITIONS],
    },
    feedback: {
      templates: [...BUILTIN_FEEDBACK_TEMPLATES],
    },
    defaults: {
      rules: DEFAULT_OPERATIONAL_RULES,
      managedFields: {
        "taskAttention.reviewAttentionDays": "user-overridable",
        "taskAttention.longReviewHighlightDays": "user-overridable",
        "taskAttention.noActivityDays": "user-overridable",
        "vacation.soonWithinDays": "user-overridable",
      },
    },
    features: {
      confluence: true,
      feedback: true,
      goals: true,
      onboarding: true,
      directorOrganization: true,
      projectCockpit: true,
    },
    accessPolicy: {
      companyAdmins: { emails: [] },
      organizationScopeAllowlist: { emails: [] },
    },
    jiraWorkflowProfiles: DEFAULT_WORKFLOW_MAPPINGS.flatMap((entry) =>
      entry.projectKey
        ? [{ projectKey: entry.projectKey, issueType: entry.issueType, profileId: entry.profileId }]
        : [],
    ),
  };
}
