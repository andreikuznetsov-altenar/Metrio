import type { AuditIssue } from "../jira/types";
import { getOperationalIssues } from "../people/ownedIssues";
import type { TeamSnapshot } from "../people/types";
import { projectKeyFromIssueKey } from "../workGraph/issueProjectKey";
import type { ProjectCockpitScope } from "./projectCockpitTypes";

export function collectIssuesForScope(
  snapshot: TeamSnapshot,
  scope: ProjectCockpitScope,
): AuditIssue[] {
  const seen = new Set<string>();
  const issues: AuditIssue[] = [];
  const projectKey =
    scope.kind === "project"
      ? scope.projectKey.toUpperCase()
      : scope.projectKey?.toUpperCase();

  for (const person of snapshot.persons) {
    for (const issue of getOperationalIssues(person)) {
      if (!issue.issueKey || seen.has(issue.issueKey)) continue;
      if (scope.kind === "epic") {
        if (issue.epicKey !== scope.epicKey) continue;
      } else if (projectKeyFromIssueKey(issue.issueKey) !== projectKey) {
        continue;
      }
      if (
        scope.kind === "epic" &&
        projectKey &&
        projectKeyFromIssueKey(issue.issueKey) !== projectKey
      ) {
        continue;
      }
      seen.add(issue.issueKey);
      issues.push(issue);
    }
  }
  return issues;
}

export function distinctProjectKeys(snapshot: TeamSnapshot): string[] {
  const keys = new Set<string>();
  for (const person of snapshot.persons) {
    for (const issue of getOperationalIssues(person)) {
      const key = projectKeyFromIssueKey(issue.issueKey);
      if (key) keys.add(key);
    }
  }
  return [...keys].sort();
}
