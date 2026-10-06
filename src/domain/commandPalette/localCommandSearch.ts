import {
  CURATED_ONBOARDING_RESOURCES,
  materializeCuratedResource,
} from "../../config/onboardingResources";
import { onboardingTargetToActionTarget } from "../onboarding/resourceTypes";
import { getOperationalIssues } from "../people/ownedIssues";
import type { Person } from "../people/types";
import type { KnowledgePage } from "../workGraph/workGraphTypes";
import type { WorkProject } from "../workGraph/workGraphTypes";
import { searchPaletteCommands } from "./commandDefinitions";
import type { CommandResult } from "./commandResultTypes";
import { looksLikeIssueKey, normalizeIssueKeyQuery } from "./issueKeyPattern";
import type { CommandPaletteRecent } from "../../platform/commandPaletteRecents";

export interface LocalCommandSearchInput {
  query: string;
  people: Person[];
  projects: WorkProject[];
  knowledgePages: KnowledgePage[];
  recents: CommandPaletteRecent[];
  feedbackEnabled: boolean;
  surveyManagementEnabled: boolean;
  jiraBaseUrl: string;
}

interface CachedIssueHit {
  issueKey: string;
  summary: string;
  status?: string;
}

function collectCachedIssues(people: Person[]): CachedIssueHit[] {
  const seen = new Set<string>();
  const hits: CachedIssueHit[] = [];
  for (const person of people) {
    for (const issue of getOperationalIssues(person)) {
      if (!issue.issueKey || seen.has(issue.issueKey)) continue;
      seen.add(issue.issueKey);
      hits.push({
        issueKey: issue.issueKey,
        summary: issue.issueSummary || issue.issueKey,
        status: issue.currentStatus,
      });
    }
  }
  return hits;
}

function personSubtitle(person: Person): string {
  const title = person.bamboo.jobTitle?.trim();
  const dept = person.bamboo.department?.trim();
  if (title && dept) return `${title} · ${dept}`;
  return title || dept || "Open person";
}

function scoreTextMatch(haystack: string, query: string): number {
  const h = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;
  if (h === q) return 500;
  if (h.startsWith(q)) return 420;
  if (h.includes(q)) return 360;
  return 0;
}

function curatedResourceResults(query: string, jiraBaseUrl: string): CommandResult[] {
  const q = query.trim().toLowerCase();
  const results: CommandResult[] = [];
  for (const def of CURATED_ONBOARDING_RESOURCES) {
    const resource = materializeCuratedResource(def, jiraBaseUrl);
    const haystack = [
      resource.title,
      resource.description ?? "",
      ...(resource.tags ?? []),
      resource.group,
    ]
      .join(" ")
      .toLowerCase();
    if (q && !haystack.includes(q) && !resource.title.toLowerCase().startsWith(q)) {
      continue;
    }
    const score = q ? scoreTextMatch(resource.title, q) + 40 : 120;
    results.push({
      id: `resource-${resource.id}`,
      type: "resource",
      title: resource.title,
      subtitle: resource.description ?? resource.group,
      meta: "Company",
      section: "resources",
      score,
      target: {
        kind: "resource",
        target: onboardingTargetToActionTarget(resource.target),
      },
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

function recentToResult(recent: CommandPaletteRecent, index: number): CommandResult {
  return {
    id: `recent-${recent.type}-${recent.id}`,
    type: recent.type,
    title: recent.title,
    subtitle: recent.subtitle ?? "Recent",
    meta: recent.meta,
    section: "recents",
    score: 250 - index,
    target: recent.target,
  };
}

export function searchLocalCommandPalette(
  input: LocalCommandSearchInput,
): CommandResult[] {
  const query = input.query.trim();
  const qLower = query.toLowerCase();
  const results: CommandResult[] = [];

  if (!query) {
    for (const [index, recent] of input.recents.slice(0, 8).entries()) {
      results.push(recentToResult(recent, index));
    }
    results.push(
      ...searchPaletteCommands("", {
        feedbackEnabled: input.feedbackEnabled,
      }),
    );
    return mergeAndSort(results).slice(0, 12);
  }

  const issueKey = looksLikeIssueKey(query) ? normalizeIssueKeyQuery(query) : null;
  const cachedIssues = collectCachedIssues(input.people);

  if (issueKey) {
    const exact = cachedIssues.find(
      (issue) => issue.issueKey.toUpperCase() === issueKey,
    );
    if (exact) {
      results.push({
        id: `jira-${exact.issueKey}`,
        type: "jira_issue",
        title: `${exact.issueKey} · ${exact.summary}`,
        subtitle: "Open issue",
        meta: exact.status,
        section: "jira",
        score: 1000,
        target: { kind: "jira", issueKey: exact.issueKey },
      });
    } else {
      results.push({
        id: `jira-remote-${issueKey}`,
        type: "jira_issue",
        title: issueKey,
        subtitle: "Look up in Jira",
        section: "jira",
        score: 980,
        target: { kind: "jira", issueKey },
      });
    }
  }

  for (const person of input.people) {
    const name = person.bamboo.displayName?.trim() ?? "";
    if (!name) continue;
    const score = scoreTextMatch(name, query);
    const titleScore = person.bamboo.jobTitle
      ? scoreTextMatch(person.bamboo.jobTitle, query) * 0.6
      : 0;
    const total = Math.max(score, titleScore);
    if (total <= 0) continue;
    results.push({
      id: `person-${person.id}`,
      type: "person",
      title: name,
      subtitle: personSubtitle(person),
      section: "people",
      score: total + (score >= 500 ? 80 : 0),
      target: { kind: "person", personId: person.id },
    });
  }

  for (const issue of cachedIssues) {
    if (issueKey && issue.issueKey.toUpperCase() === issueKey) continue;
    const keyScore = scoreTextMatch(issue.issueKey, query);
    const summaryScore = scoreTextMatch(issue.summary, query);
    const total = Math.max(keyScore, summaryScore * 0.9);
    if (total <= 0) continue;
    results.push({
      id: `jira-${issue.issueKey}`,
      type: "jira_issue",
      title: `${issue.issueKey} · ${issue.summary}`,
      subtitle: "Open issue",
      meta: issue.status,
      section: "jira",
      score: total,
      target: { kind: "jira", issueKey: issue.issueKey },
    });
  }

  for (const project of input.projects) {
    const keyScore = scoreTextMatch(project.key, query) + 30;
    const nameScore = scoreTextMatch(project.name, query);
    const total = Math.max(keyScore, nameScore);
    if (total <= 0) continue;
    results.push({
      id: `project-${project.key}`,
      type: "jira_project",
      title: project.key,
      subtitle: project.name,
      section: "jira",
      score: total,
      target: {
        kind: "jira_project",
        projectKey: project.key,
        url: project.jiraUrl,
      },
    });
  }

  for (const page of input.knowledgePages) {
    const titleScore = scoreTextMatch(page.title, query);
    const spaceScore = page.spaceName
      ? scoreTextMatch(page.spaceName, query) * 0.7
      : 0;
    const total = Math.max(titleScore, spaceScore);
    if (total <= 0) continue;
    results.push({
      id: `confluence-${page.id}`,
      type: "confluence_page",
      title: page.title,
      subtitle: page.spaceName ?? page.spaceKey ?? "Confluence",
      meta: page.spaceName,
      section: "confluence",
      score: total * 0.85,
      target: { kind: "confluence", url: page.url, pageId: page.id },
    });
  }

  results.push(
    ...searchPaletteCommands(query, { feedbackEnabled: input.feedbackEnabled }),
  );
  results.push(...curatedResourceResults(query, input.jiraBaseUrl));

  if (
    input.feedbackEnabled &&
    input.surveyManagementEnabled &&
    (!qLower ||
      qLower.includes("feedback") ||
      qLower.includes("survey") ||
      qLower.includes("delivery"))
  ) {
    if (
      !qLower ||
      qLower.includes("feedback") ||
      qLower.includes("survey") ||
      qLower.includes("delivery")
    ) {
      results.push({
        id: "feedback-nav",
        type: "feedback",
        title: "Feedback",
        subtitle: "Surveys and delivery",
        section: "feedback",
        score: qLower.includes("feedback") ? 750 : 180,
        target: { kind: "feedback", tab: "survey" },
      });
    }
  }

  return mergeAndSort(results).slice(0, 20);
}

function mergeAndSort(results: CommandResult[]): CommandResult[] {
  const byId = new Map<string, CommandResult>();
  for (const result of results) {
    const existing = byId.get(result.id);
    if (!existing || result.score > existing.score) {
      byId.set(result.id, result);
    }
  }
  return [...byId.values()].sort((a, b) => b.score - a.score);
}

export function collectKnowledgePages(
  knowledgeByIssue: Map<string, { page: KnowledgePage }[]>,
  knowledgeByProject: Map<string, { page: KnowledgePage }[]>,
): KnowledgePage[] {
  const byId = new Map<string, KnowledgePage>();
  const ingest = (links: { page: KnowledgePage }[]) => {
    for (const link of links) {
      byId.set(link.page.id, link.page);
    }
  };
  for (const links of knowledgeByIssue.values()) ingest(links);
  for (const links of knowledgeByProject.values()) ingest(links);
  return [...byId.values()];
}
