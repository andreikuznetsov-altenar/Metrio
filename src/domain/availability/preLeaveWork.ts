import type { AuditIssue } from "../jira/types";
import type { ReportParams } from "../jira/types";
import type { Person } from "../people/types";
import { getOperationalIssues } from "../people/ownedIssues";
import { classifyTaskHealth } from "../task-health/taskHealthEngine";
import type { PersonWorkRowData } from "../analytics/personAnalyticsWorkspace";
import { auditIssueToPersonWorkRow } from "../analytics/personAnalyticsWorkspace";

export interface PreLeaveWorkSummary {
  activeCount: number;
  inReviewCount: number;
  rows: PersonWorkRowData[];
}

export function buildPreLeaveWorkSummary(
  person: Person,
  params: ReportParams,
  maxRows = 5,
  now = new Date(),
): PreLeaveWorkSummary {
  const issues = getOperationalIssues(person);
  const activeCount = issues.length;
  const inReviewCount = issues.filter((issue) =>
    /review/i.test(issue.currentStatus || ""),
  ).length;

  const ranked = [...issues].sort((a, b) => rankIssue(b, params, now) - rankIssue(a, params, now));
  const rows = ranked
    .slice(0, maxRows)
    .map((issue) => auditIssueToPersonWorkRow(issue, params, now));

  return { activeCount, inReviewCount, rows };
}

function rankIssue(issue: AuditIssue, params: ReportParams, now: Date): number {
  const health = classifyTaskHealth({ issue, params, now }).status;
  if (health === "problematic") return 5;
  if (health === "at_risk") return 4;
  if (/review/i.test(issue.currentStatus || "")) return 3;
  return 1;
}
