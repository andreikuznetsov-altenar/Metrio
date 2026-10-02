import type { ActionTarget } from "../actions/actionTypes";

export type OnboardingResourceSource =
  | "curated"
  | "jira"
  | "confluence"
  | "bamboo";

export type OnboardingResourceAudience =
  | "company"
  | "department"
  | "team"
  | "location"
  | "role_context"
  | "project";

export type OnboardingResourceGroup =
  | "company"
  | "department"
  | "team_projects"
  | "tools"
  | "policies";

export type OnboardingResourceTarget =
  | { kind: "external"; url: string }
  | { kind: "jira_project"; projectKey: string; url: string }
  | { kind: "confluence_page"; pageId: string; url: string }
  | { kind: "confluence_space"; spaceKey: string; url: string }
  | { kind: "bamboo_portal" }
  | { kind: "metrio_resources" };

export interface OnboardingResource {
  id: string;
  title: string;
  description?: string;
  source: OnboardingResourceSource;
  audience: OnboardingResourceAudience;
  group: OnboardingResourceGroup;
  target: OnboardingResourceTarget;
  priority: number;
  tags?: string[];
}

export interface OnboardingResourceMatchInput {
  department?: string;
  jobTitle?: string;
  location?: string;
  teamLabel?: string;
  projects: { key: string; name: string; jiraUrl: string }[];
  confluenceLinks: {
    id: string;
    title: string;
    url: string;
    confidence: string;
    projectKey?: string;
  }[];
}

export interface MatchedOnboardingResources {
  preview: OnboardingResource[];
  all: OnboardingResource[];
  byGroup: Partial<Record<OnboardingResourceGroup, OnboardingResource[]>>;
}

export const NEW_STARTER_PREVIEW_LIMIT = 6;

export function onboardingTargetToActionTarget(
  target: OnboardingResourceTarget,
): ActionTarget {
  switch (target.kind) {
    case "external":
      return { kind: "confluence", pageId: "", url: target.url };
    case "jira_project":
      return { kind: "confluence", pageId: "", url: target.url };
    case "confluence_page":
      return { kind: "confluence", pageId: target.pageId, url: target.url };
    case "confluence_space":
      return { kind: "confluence", pageId: "", url: target.url };
    case "bamboo_portal":
      return { kind: "home" };
    case "metrio_resources":
      return { kind: "home" };
    default:
      return { kind: "home" };
  }
}
