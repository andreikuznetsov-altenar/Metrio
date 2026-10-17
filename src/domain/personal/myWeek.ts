import { getCurrentWeekRange } from '../periods/dateRange';
import {
  countBackflowsInRange,
  countCompletedCyclesByIssue,
} from '../periods/issuePeriodMetrics';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import { classifyIssueAttention, getActiveIssues } from '../radar/taskSignals';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';
import { getOperationalIssues } from '../people/ownedIssues';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';

import { appNow } from "../../platform/appClock";
export interface MyWeekAttentionTask {
  issueKey: string;
  summary: string;
  status: string;
  reason: string;
  issue: AuditIssue;
}

export interface MyWeekSummary {
  /** Completed CYCLES this week: the KPI's definition of completed work (an issue can count twice). */
  completedThisWeek: number;
  currentlyActive: number;
  atRisk: number;
  inReview: number;
  backflowsThisWeek: number;
}

export interface MyWeekGroups {
  summary: MyWeekSummary;
  needsAttention: MyWeekAttentionTask[];
  inProgress: AuditIssue[];
  inReview: AuditIssue[];
  /** One entry per issue completed this week; see `completedCycleCounts` for repeat completions. */
  completedThisWeek: AuditIssue[];
  /** Completed cycles this week per issue key (only issues listed in `completedThisWeek`). */
  completedCycleCounts: Record<string, number>;
}

function currentStage(issue: AuditIssue) {
  return resolveWorkflowStage(
    resolveWorkflowProfile(issue),
    issue.currentStatus || '',
  );
}

export function buildMyWeek(
  person: Person,
  params: ReportParams,
  now = appNow(),
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): MyWeekGroups {
  const weekRange = getCurrentWeekRange(now);
  // "My week" is the person's own completed work and backflows: the same canonical owner
  // attribution and eligible issue population as the KPI and Work History.
  const canonical = person.jira?.canonicalKey;
  const cycleCounts = countCompletedCyclesByIssue(person.issues, weekRange, canonical);
  const completedThisWeek = [...new Map(person.issues.map((issue) => [issue.issueKey, issue])).values()]
    .filter((issue) => cycleCounts.has(issue.issueKey));
  const completedCycles = [...cycleCounts.values()].reduce((sum, n) => sum + n, 0);
  const operationalIssues = getOperationalIssues(person);
  const activeIssues = getActiveIssues(person, params);

  const needsAttention: MyWeekAttentionTask[] = [];
  for (const issue of operationalIssues) {
    const attention = classifyIssueAttention(issue, params, now, rules);
    if (!attention) continue;
    needsAttention.push({
      issueKey: issue.issueKey,
      summary: issue.issueSummary,
      status: issue.currentStatus || '—',
      reason: attention.reason,
      issue,
    });
  }

  const inProgress = activeIssues;
  const inReview = operationalIssues.filter((issue) => currentStage(issue).countsAsReview);
  const atRisk = operationalIssues.filter(
    (issue) => classifyTaskHealth({ issue, params, now }).status === 'at_risk',
  );

  return {
    summary: {
      completedThisWeek: completedCycles,
      currentlyActive: activeIssues.length,
      atRisk: atRisk.length,
      inReview: inReview.length,
      backflowsThisWeek: countBackflowsInRange(person.issues, weekRange, canonical),
    },
    needsAttention,
    inProgress,
    inReview,
    completedThisWeek,
    completedCycleCounts: Object.fromEntries(cycleCounts),
  };
}

export function formatMyWeekWeeklySummary(
  personName: string,
  week: MyWeekGroups,
): string {
  const lines = [
    personName,
    '',
    'My week',
    '',
    `Completed: ${week.summary.completedThisWeek}`,
    `In progress: ${week.inProgress.length}`,
    `In review: ${week.inReview.length}`,
    `At risk: ${week.summary.atRisk}`,
    `Backflows this week: ${week.summary.backflowsThisWeek}`,
  ];

  const highlights: string[] = [];
  if (week.summary.completedThisWeek > 0) {
    highlights.push(`${week.summary.completedThisWeek} tasks completed this week`);
  }
  if (week.summary.inReview > 0) {
    highlights.push(`${week.summary.inReview} tasks are currently in review`);
  }

  if (highlights.length) {
    lines.push('', 'Highlights:');
    highlights.forEach((h) => lines.push(`- ${h}`));
  }

  if (week.needsAttention.length) {
    lines.push('', 'Needs attention:');
    week.needsAttention.slice(0, 5).forEach((task) => {
      lines.push(`- ${task.issueKey} ${task.reason}`);
    });
  } else {
    lines.push('', 'Needs attention:', '- Nothing needs attention right now.');
  }

  return lines.join('\n');
}
