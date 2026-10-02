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

function deptKey(name: string): string {
  return name.trim().toLowerCase();
}

export const CURATED_ONBOARDING_RESOURCES: CuratedOnboardingResourceDef[] = [
  {
    id: "company-handbook",
    title: "Company handbook",
    description: "Policies and how we work",
    group: "company",
    audience: "company",
    source: "curated",
    priority: 100,
    tags: ["policies", "onboarding"],
    target: {
      kind: "external",
      url: "https://altenar.atlassian.net/wiki/spaces/HANDBOOK",
    },
  },
  {
    id: "company-benefits",
    title: "Benefits overview",
    group: "policies",
    audience: "company",
    source: "curated",
    priority: 95,
    tags: ["benefits"],
    target: { kind: "bamboo_portal" },
  },
  {
    id: "bamboo-time-off",
    title: "Time off & HR",
    group: "tools",
    audience: "company",
    source: "bamboo",
    priority: 90,
    tags: ["bamboo", "time off"],
    target: { kind: "bamboo_portal" },
  },
  {
    id: "design-handbook",
    title: "Design handbook",
    group: "department",
    audience: "department",
    audienceKey: deptKey("Design"),
    source: "curated",
    priority: 80,
    jobTitleHints: ["design", "ux", "product designer"],
    target: {
      kind: "external",
      url: "https://altenar.atlassian.net/wiki/spaces/DESIGN",
    },
  },
  {
    id: "design-jira",
    title: "UX Jira board",
    group: "department",
    audience: "department",
    audienceKey: deptKey("Design"),
    source: "jira",
    priority: 75,
    jobTitleHints: ["design", "ux"],
    target: { kind: "jira_project_key", projectKey: "UX" },
  },
  {
    id: "engineering-handbook",
    title: "Engineering handbook",
    group: "department",
    audience: "department",
    audienceKey: deptKey("Engineering"),
    source: "curated",
    priority: 80,
    jobTitleHints: ["engineer", "developer", "devops"],
    target: {
      kind: "external",
      url: "https://altenar.atlassian.net/wiki/spaces/ENG",
    },
  },
  {
    id: "engineering-workflow",
    title: "Development workflow",
    group: "department",
    audience: "department",
    audienceKey: deptKey("Engineering"),
    source: "curated",
    priority: 70,
    target: {
      kind: "external",
      url: "https://altenar.atlassian.net/wiki/spaces/ENG/pages/workflow",
    },
  },
  {
    id: "location-malta",
    title: "Malta office guide",
    group: "company",
    audience: "location",
    audienceKey: "malta",
    source: "curated",
    priority: 65,
    tags: ["office"],
    target: {
      kind: "external",
      url: "https://altenar.atlassian.net/wiki/spaces/OFFICE/pages/malta",
    },
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
