import type { AuditIssue } from "../jira/types";
import type { WorkProject } from "./workGraphTypes";
import { projectKeyFromIssueKey } from "./issueProjectKey";

export interface JiraProjectMeta {
  id: string;
  key: string;
  name: string;
}

export function discoverRelevantProjects(input: {
  activeIssues: AuditIssue[];
  recentCompletedIssues: AuditIssue[];
  accessibleProjects: JiraProjectMeta[];
  jiraBaseUrl: string;
}): WorkProject[] {
  const byKey = new Map<string, WorkProject>();

  const bump = (
    issue: AuditIssue,
    relevance: WorkProject["relevance"],
    activeDelta: number,
  ) => {
    const key = projectKeyFromIssueKey(issue.issueKey);
    if (!key) return;
    const existing = byKey.get(key);
    const name =
      findProjectName(input.accessibleProjects, key) ?? `${key} project`;
    const jiraUrl = `${input.jiraBaseUrl.replace(/\/+$/, "")}/browse/${key}`;
    if (!existing) {
      byKey.set(key, {
        id: key,
        key,
        name,
        jiraUrl,
        relevance,
        activeTaskCount: activeDelta,
        linkedSpaceKey: key,
      });
      return;
    }
    if (rank(relevance) < rank(existing.relevance)) {
      existing.relevance = relevance;
    }
    existing.activeTaskCount += activeDelta;
  };

  for (const issue of input.activeIssues) {
    bump(issue, "assigned", 1);
  }
  for (const issue of input.recentCompletedIssues) {
    bump(issue, "recent", 0);
  }

  for (const project of input.accessibleProjects) {
    if (byKey.has(project.key)) continue;
    byKey.set(project.key, {
      id: project.id,
      key: project.key,
      name: project.name,
      jiraUrl: `${input.jiraBaseUrl.replace(/\/+$/, "")}/browse/${project.key}`,
      relevance: "accessible",
      activeTaskCount: 0,
      linkedSpaceKey: project.key,
    });
  }

  return [...byKey.values()]
    .filter((p) => p.relevance !== "accessible" || p.activeTaskCount > 0)
    .sort((a, b) => rank(a.relevance) - rank(b.relevance) || b.activeTaskCount - a.activeTaskCount);
}

function rank(relevance: WorkProject["relevance"]): number {
  if (relevance === "assigned") return 0;
  if (relevance === "recent") return 1;
  return 2;
}

function findProjectName(
  projects: JiraProjectMeta[],
  key: string,
): string | undefined {
  return projects.find((p) => p.key === key)?.name;
}
