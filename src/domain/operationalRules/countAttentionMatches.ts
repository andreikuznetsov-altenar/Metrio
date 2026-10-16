import type { ReportParams } from "../jira/types";
import type { TeamSnapshot } from "../people/types";
import { getOperationalIssues } from "../people/ownedIssues";
import { classifyIssueAttention, stageAgeDays } from "../radar/taskSignals";
import type { OperationalRules } from "./operationalRulesTypes";

import { appNow } from "../../platform/appClock";
/** Preview counts for Settings using already-loaded team data (no network). */
export function countReviewAttentionMatches(
  snapshot: TeamSnapshot | null | undefined,
  params: ReportParams | undefined,
  rules: OperationalRules,
  now = appNow(),
): number {
  if (!snapshot || !params) return 0;
  let count = 0;
  for (const person of snapshot.persons) {
    for (const issue of getOperationalIssues(person)) {
      const attention = classifyIssueAttention(issue, params, now, rules);
      if (!attention) continue;
      const days = stageAgeDays(issue, now);
      if (
        attention.health.stageKind === "review" &&
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
  now = appNow(),
): number {
  if (!snapshot || !params) return 0;
  let count = 0;
  for (const person of snapshot.persons) {
    for (const issue of getOperationalIssues(person)) {
      const attention = classifyIssueAttention(issue, params, now, rules);
      if (attention?.health.isStale) {
        count += 1;
      }
    }
  }
  return count;
}
