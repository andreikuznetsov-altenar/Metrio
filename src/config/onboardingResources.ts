import { bambooEmployeePortalUrl } from "./bambooPortal";
import type {
  OnboardingResource,
  OnboardingResourceGroup,
} from "../domain/onboarding/resourceTypes";

/**
 * Versioned curated onboarding catalog.
 * Replaceable by remote/admin config without changing UI components.
 */
export const ONBOARDING_RESOURCE_CONFIG_VERSION = 1;

export interface CuratedOnboardingResourceDef {
  id: string;
  title: string;
  description?: string;
  group: OnboardingResourceGroup;
  audience: OnboardingResource["audience"];
  /** department name, location key, or team label — case-insensitive match */
  audienceKey?: string;
  source: OnboardingResource["source"];
  priority: number;
  tags?: string[];
  /** Boost when jobTitle contains any hint (relevance only, not access). */
  jobTitleHints?: string[];
  target:
    | { kind: "external"; url: string }
    | { kind: "bamboo_portal" }
    | { kind: "jira_project_key"; projectKey: string }
    | { kind: "confluence_space_key"; spaceKey: string; url: string };
}

export function deptKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Production-safe curated entries only — no guessed Confluence space URLs.
 * Admin CompanyConfig resources and API-discovered links supply handbook URLs.
 */
export const CURATED_ONBOARDING_RESOURCES: CuratedOnboardingResourceDef[] = [
  {
    id: "bamboo-hr-portal",
    title: "Open BambooHR",
    description: "Time off, HR, and your employee profile",
    group: "tools",
    audience: "company",
    source: "bamboo",
    priority: 95,
    tags: ["bamboo", "hr"],
    target: { kind: "bamboo_portal" },
  },
  {
    id: "design-jira",
    title: "UX Jira board",
    group: "department",
    audience: "department",
    audienceKey: deptKey("Design"),
    source: "jira",
    priority: 75,
    jobTitleHints: ["design", "ux", "product designer"],
    target: { kind: "jira_project_key", projectKey: "UX" },
  },
];

export function resolveCuratedTarget(
  def: CuratedOnboardingResourceDef,
  jiraBaseUrl: string,
): OnboardingResource["target"] {
  switch (def.target.kind) {
    case "external":
      return { kind: "external", url: def.target.url };
    case "bamboo_portal":
      return { kind: "bamboo_portal" };
    case "jira_project_key": {
      const base = jiraBaseUrl.replace(/\/+$/, "");
      if (!base) {
        return { kind: "jira_project", projectKey: def.target.projectKey, url: "" };
      }
      return {
        kind: "jira_project",
        projectKey: def.target.projectKey,
        url: `${base}/browse/${encodeURIComponent(def.target.projectKey)}`,
      };
    }
    case "confluence_space_key":
      return {
        kind: "confluence_space",
        spaceKey: def.target.spaceKey,
        url: def.target.url,
      };
    default:
      return { kind: "bamboo_portal" };
  }
}

export function materializeCuratedResource(
  def: CuratedOnboardingResourceDef,
  jiraBaseUrl: string,
): OnboardingResource {
  return {
    id: def.id,
    title: def.title,
    description: def.description,
    source: def.source,
    audience: def.audience,
    group: def.group,
    priority: def.priority,
    tags: def.tags,
    target: resolveCuratedTarget(def, jiraBaseUrl),
  };
}

export function bambooPortalResourceUrl(): string {
  return bambooEmployeePortalUrl();
}
