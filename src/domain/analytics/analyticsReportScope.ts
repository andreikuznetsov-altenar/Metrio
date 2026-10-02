import type { AuditReportData, AuditIssue } from "../jira/types";
import type { IssueAttribution } from "./analyticsEvidenceTypes";

export function flattenTeamKpiIssues(grouped: AuditReportData["grouped"]): AuditIssue[] {
  const seen: Record<string, boolean> = {};
  const out: AuditIssue[] = [];

  Object.keys(grouped || {}).forEach((userKey) => {
    (grouped[userKey]?.issues || []).forEach((issue) => {
      if (!seen[issue.issueKey]) {
        seen[issue.issueKey] = true;
        out.push(issue);
      }
    });
  });

  return out;
}

export function buildIssueAttributionIndex(
  grouped: AuditReportData["grouped"],
): Record<string, IssueAttribution> {
  const index: Record<string, IssueAttribution> = {};

  Object.entries(grouped || {}).forEach(([userKey, block]) => {
    (block.issues || []).forEach((issue) => {
      if (!index[issue.issueKey]) {
        index[issue.issueKey] = {
          personCanonical: userKey,
          personName: block.userLabel || userKey,
        };
      }
    });
  });

  return index;
}

export function targetScopeLabel(reviewTarget: string): string {
  if (reviewTarget === "sprint") return "Sprint target";
  if (reviewTarget === "org") return "Org target";
  return "Team target";
}
