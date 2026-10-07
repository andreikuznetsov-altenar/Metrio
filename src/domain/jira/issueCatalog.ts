import type { AuditIssue } from "./types";
import type { Person } from "../people/types";
import { collectUniqueTeamIssues } from "./uniqueIssues";

export type IssueCatalog = ReadonlyMap<string, AuditIssue>;

export function buildIssueCatalog(input: {
  persons?: Person[];
  issues?: AuditIssue[];
}): IssueCatalog {
  const map = new Map<string, AuditIssue>();
  for (const issue of input.issues ?? []) {
    if (issue.issueKey) {
      map.set(issue.issueKey, issue);
    }
  }
  for (const issue of collectUniqueTeamIssues(input.persons ?? [])) {
    if (!map.has(issue.issueKey)) {
      map.set(issue.issueKey, issue);
    }
  }
  return map;
}

export function resolveCatalogIssue(
  catalog: IssueCatalog | undefined,
  issueKey: string,
): AuditIssue | undefined {
  if (!catalog) return undefined;
  return catalog.get(issueKey);
}
