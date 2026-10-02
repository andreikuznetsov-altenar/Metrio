import type { ConfluencePageSummary } from "../../services/confluence/confluenceClient";

export type LinkConfidence =
  | "explicit_link"
  | "exact_issue_key"
  | "explicit_project_space"
  | "exact_project_key"
  | "contextual_search";

export interface WorkProject {
  id: string;
  key: string;
  name: string;
  jiraUrl: string;
  relevance: "assigned" | "recent" | "accessible";
  activeTaskCount: number;
  linkedSpaceKey?: string;
}

export interface WorkInitiative {
  id: string;
  key: string;
  summary: string;
  projectKey: string;
}

export interface KnowledgeSpace {
  key: string;
  name?: string;
  url: string;
  linkedProjectKey?: string;
}

export interface KnowledgePage {
  id: string;
  title: string;
  spaceKey?: string;
  spaceName?: string;
  url: string;
  updatedAt?: string;
  excerpt?: string;
}

export interface WorkKnowledgeLink {
  id: string;
  confidence: LinkConfidence;
  source: "jira" | "confluence";
  projectKey?: string;
  issueKey?: string;
  initiativeKey?: string;
  page: KnowledgePage;
  label?: string;
}

export function pageFromSummary(summary: ConfluencePageSummary): KnowledgePage {
  return {
    id: summary.id,
    title: summary.title,
    spaceKey: summary.spaceKey,
    spaceName: summary.spaceName,
    url: summary.url,
    updatedAt: summary.updatedAt,
    excerpt: summary.excerpt,
  };
}

export function confidenceLabel(confidence: LinkConfidence): string {
  switch (confidence) {
    case "explicit_link":
      return "Explicitly linked";
    case "exact_issue_key":
      return "Matches issue key";
    case "explicit_project_space":
      return "Project space";
    case "exact_project_key":
      return "Matches project key";
    case "contextual_search":
      return "Suggested documentation";
    default:
      return "Related";
  }
}
