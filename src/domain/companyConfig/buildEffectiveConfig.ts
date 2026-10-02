import type { AppPreferences } from "../../platform/preferences";
import { normalizeOperationalRules } from "../operationalRules/normalizeOperationalRules";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";
import type { CuratedOnboardingResourceDef } from "../../config/onboardingResources";
import type { ChecklistItemDefinition } from "../../config/onboardingChecklistDefinitions";
import type { FeedbackSurveyTemplate } from "../feedbackCycles/feedbackCycleTypes";
import type { CompanyConfig, FeatureFlags, ManagedSettingPolicy } from "./companyConfigTypes";
import { isCompanyAdmin, resolveAdminIdentity, type AdminIdentity } from "./companyAdmin";

export interface IntegrationCapabilities {
  jiraConfigured: boolean;
  bambooConfigured: boolean;
  googleFeedbackConfigured: boolean;
}

export interface EffectiveConfig {
  company: CompanyConfig;
  features: FeatureFlags;
  resources: CompanyConfig["resources"];
  checklistItems: ChecklistItemDefinition[];
  feedbackTemplates: FeedbackSurveyTemplate[];
  newStarterDays: number;
  feedbackOnboardingDays: number[];
  operationalRules: OperationalRules;
  managedFields: Record<string, ManagedSettingPolicy>;
  isCompanyAdmin: boolean;
  identity: AdminIdentity;
  /** Read-only summary for normal users */
  publicInfo: {
    displayName: string;
    supportUrl?: string;
    enabledFeatures: string[];
  };
}

function mergeOperationalRules(
  companyDefaults: OperationalRules,
  userRules: OperationalRules,
  managed: Record<string, ManagedSettingPolicy>,
): OperationalRules {
  const base = normalizeOperationalRules(companyDefaults);
  const user = normalizeOperationalRules(userRules);
  const reviewManaged = managed["taskAttention.reviewAttentionDays"] === "managed";
  const longManaged = managed["taskAttention.longReviewHighlightDays"] === "managed";
  const noActManaged = managed["taskAttention.noActivityDays"] === "managed";
  const vacationManaged = managed["vacation.soonWithinDays"] === "managed";

  return {
    ...user,
    taskAttention: {
      ...user.taskAttention,
      reviewAttentionDays: reviewManaged
        ? base.taskAttention.reviewAttentionDays
        : user.taskAttention.reviewAttentionDays,
      longReviewHighlightDays: longManaged
        ? base.taskAttention.longReviewHighlightDays
        : user.taskAttention.longReviewHighlightDays,
      noActivityDays: noActManaged
        ? base.taskAttention.noActivityDays
        : user.taskAttention.noActivityDays,
    },
    vacation: {
      ...user.vacation,
      soonWithinDays: vacationManaged
        ? base.vacation.soonWithinDays
        : user.vacation.soonWithinDays,
    },
  };
}

function applyCapabilityGates(
  features: FeatureFlags,
  caps: IntegrationCapabilities,
): FeatureFlags {
  return {
    ...features,
    feedback: features.feedback && caps.googleFeedbackConfigured,
    confluence: features.confluence && caps.jiraConfigured,
  };
}

export function buildEffectiveConfig(input: {
  company: CompanyConfig;
  prefs: AppPreferences;
  currentUser: import("../types").CurrentUser;
  capabilities: IntegrationCapabilities;
}): EffectiveConfig {
  const identity = resolveAdminIdentity(
    input.currentUser,
    input.prefs.workEmail || input.prefs.bambooWorkEmail,
  );
  const admin = isCompanyAdmin(identity, input.company.accessPolicy);
  const features = applyCapabilityGates(input.company.features, input.capabilities);
  const operationalRules = mergeOperationalRules(
    input.company.defaults.rules,
    input.prefs.operationalRules,
    input.company.defaults.managedFields,
  );

  const enabledFeatures: string[] = [];
  if (features.confluence) enabledFeatures.push("Confluence");
  if (features.feedback) enabledFeatures.push("Feedback");
  if (features.goals) enabledFeatures.push("Goals");
  if (features.onboarding) enabledFeatures.push("Onboarding");
  if (features.projectCockpit) enabledFeatures.push("Project Cockpit");
  if (features.directorOrganization) enabledFeatures.push("Director view");

  return {
    company: input.company,
    features,
    resources: input.company.resources,
    checklistItems: input.company.onboarding.checklistItems,
    feedbackTemplates: input.company.feedback.templates,
    newStarterDays: input.company.onboarding.newStarterDays,
    feedbackOnboardingDays: input.company.onboarding.feedbackOnboardingDays,
    operationalRules,
    managedFields: input.company.defaults.managedFields,
    isCompanyAdmin: admin,
    identity,
    publicInfo: {
      displayName: input.company.company.displayName,
      supportUrl: input.company.company.supportUrl,
      enabledFeatures,
    },
  };
}

/** Map company resource config to legacy curated def shape for existing matchers. */
export function toCuratedResourceDefs(
  resources: CompanyConfig["resources"],
): CuratedOnboardingResourceDef[] {
  return resources.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    group: r.group,
    audience: r.audience,
    audienceKey: r.audienceKey,
    source: r.source,
    priority: r.priority,
    tags: r.tags,
    jobTitleHints: r.jobTitleHints,
    target: r.target,
  }));
}

export function isManagedField(
  effective: EffectiveConfig,
  fieldKey: string,
): boolean {
  return effective.managedFields[fieldKey] === "managed";
}
