import type { ReportParams } from "../jira/types";
import type { TeamSnapshot } from "../people/types";
import { getOperationalIssues } from "../people/ownedIssues";
import { classifyIssueAttention, stageAgeDays } from "../radar/taskSignals";
import type { OperationalRules } from "./operationalRulesTypes";

/** Preview counts for Settings using already-loaded team data (no network). */
export function countReviewAttentionMatches(
  snapshot: TeamSnapshot | null | undefined,
  params: ReportParams | undefined,
  rules: OperationalRules,
  now = new Date(),
): number {
  if (!snapshot || !params) return 0;
  let count = 0;
  for (const person of snapshot.persons) {
    for (const issue of getOperationalIssues(person)) {
      const attention = classifyIssueAttention(issue, params, now, rules);
      if (!attention) continue;
      const status = issue.currentStatus || "";
      const days = stageAgeDays(issue, now);
      if (
        /review/i.test(status) &&
        days !== null &&
        days >= rules.taskAttention.reviewAttentionDays
      ) {
        count += 1;
      }
    }
  }
  return count;
}

export function countNoActivityMatches(
  snapshot: TeamSnapshot | null | undefined,
  params: ReportParams | undefined,
  rules: OperationalRules,
  now = new Date(),
): number {
  if (!snapshot || !params) return 0;
  let count = 0;
  for (const person of snapshot.persons) {
    for (const issue of getOperationalIssues(person)) {
      const attention = classifyIssueAttention(issue, params, now, rules);
      if (attention?.reason.toLowerCase().includes("no activity")) {
        count += 1;
      }
    }
  }
  return count;
}
