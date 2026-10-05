import { normalizeOperationalRules } from "../operationalRules/normalizeOperationalRules";
import {
  COMPANY_CONFIG_SCHEMA_VERSION,
  type CompanyConfig,
  type ConfigValidationResult,
} from "./companyConfigTypes";
import { hostMatchesAllowlist, isAllowedHttpsUrl } from "./urlSecurity";

const SECRET_KEYS = /^(api[_-]?key|token|secret|password|credential|private[_-]?key)$/i;

function rejectSecrets(obj: unknown, path = "", errors: string[]): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => rejectSecrets(item, `${path}[${i}]`, errors));
    return;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const full = path ? `${path}.${key}` : key;
    if (SECRET_KEYS.test(key)) {
      errors.push(`Secret field not allowed: ${full}`);
      continue;
    }
    rejectSecrets(value, full, errors);
  }
}

export function validateCompanyConfig(raw: unknown): ConfigValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Config must be an object"] };
  }
  const input = raw as Partial<CompanyConfig>;
  rejectSecrets(raw, "", errors);

  if (
    input.schemaVersion != null &&
    input.schemaVersion !== COMPANY_CONFIG_SCHEMA_VERSION
  ) {
    errors.push(`Unsupported schemaVersion: ${input.schemaVersion}`);
  }
  if (!input.company?.displayName?.trim()) {
    errors.push("company.displayName is required");
  }
  if (!input.resources?.length) {
    errors.push("resources must not be empty");
  }
  if (!input.onboarding?.checklistItems?.length) {
    errors.push("onboarding.checklistItems must not be empty");
  }
  if (!input.feedback?.templates?.length) {
    errors.push("feedback.templates must not be empty");
  }

  const allowlist = input.integrations?.allowedUrlHostPatterns;

  for (const resource of input.resources ?? []) {
    if (!resource.id?.trim()) errors.push("resource missing id");
    const target = resource.target;
    if (target?.kind === "external") {
      if (!isAllowedHttpsUrl(target.url)) {
        errors.push(`Invalid resource URL: ${resource.id}`);
      } else if (!hostMatchesAllowlist(target.url, allowlist)) {
        errors.push(`Resource URL host not allowlisted: ${resource.id}`);
      }
    }
    if (target?.kind === "confluence_space_key") {
      if (!isAllowedHttpsUrl(target.url)) {
        errors.push(`Invalid confluence URL: ${resource.id}`);
      }
    }
  }

  if (input.company?.logoUrl && !isAllowedHttpsUrl(input.company.logoUrl)) {
    errors.push("company.logoUrl must be https");
  }
  if (input.company?.supportUrl && !isAllowedHttpsUrl(input.company.supportUrl)) {
    errors.push("company.supportUrl must be https");
  }

  const days = input.onboarding?.newStarterDays;
  if (days != null && (days < 1 || days > 120)) {
    errors.push("onboarding.newStarterDays must be 1–120");
  }

  if (input.jiraWorkflowProfiles != null) {
    if (!Array.isArray(input.jiraWorkflowProfiles)) {
      errors.push("jiraWorkflowProfiles must be an array");
    } else {
      input.jiraWorkflowProfiles.forEach((entry, index) => {
        if (!entry?.projectKey?.trim()) {
          errors.push(`jiraWorkflowProfiles[${index}].projectKey is required`);
        }
        if (!entry?.profileId?.trim()) {
          errors.push(`jiraWorkflowProfiles[${index}].profileId is required`);
        }
      });
    }
  }

  if (errors.length) return { ok: false, errors };

  const config: CompanyConfig = {
    schemaVersion: COMPANY_CONFIG_SCHEMA_VERSION,
    configVersion: String(input.configVersion ?? "1"),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    company: {
      displayName: input.company!.displayName!.trim(),
      logoUrl: input.company?.logoUrl,
      supportUrl: input.company?.supportUrl,
      internalPortalUrl: input.company?.internalPortalUrl,
    },
    integrations: input.integrations ?? {},
    departments: input.departments ?? [],
    teams: input.teams ?? [],
    resources: input.resources!,
    onboarding: {
      newStarterDays: input.onboarding!.newStarterDays ?? 60,
      feedbackOnboardingDays: input.onboarding!.feedbackOnboardingDays ?? [30],
      checklistItems: input.onboarding!.checklistItems!,
    },
    feedback: { templates: input.feedback!.templates! },
    defaults: {
      rules: normalizeOperationalRules(input.defaults?.rules),
      managedFields: input.defaults?.managedFields ?? {},
    },
    features: {
      confluence: input.features?.confluence ?? true,
      feedback: input.features?.feedback ?? true,
      goals: input.features?.goals ?? true,
      onboarding: input.features?.onboarding ?? true,
      directorOrganization: input.features?.directorOrganization ?? true,
      projectCockpit: input.features?.projectCockpit ?? true,
    },
    accessPolicy: input.accessPolicy ?? {},
    jiraWorkflowProfiles: input.jiraWorkflowProfiles,
  };

  return { ok: true, errors: [], config };
}
