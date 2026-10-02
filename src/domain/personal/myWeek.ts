import { getCurrentWeekRange } from '../periods/dateRange';
import {
  countBackflowsInRange,
  listCompletedIssuesInRange,
} from '../periods/issuePeriodMetrics';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import { classifyIssueAttention, getActiveIssues } from '../radar/taskSignals';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';

export interface MyWeekAttentionTask {
  issueKey: string;
  summary: string;
  status: string;
  reason: string;
  issue: AuditIssue;
}

export interface MyWeekSummary {
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
  completedThisWeek: AuditIssue[];
}

function isInReviewStatus(status: string): boolean {
  const n = status.toLowerCase();
  return n === 'review' || n.includes('in review');
}

function isInProgressStatus(status: string): boolean {
  return status.toLowerCase().includes('in progress');
}

export function buildMyWeek(
  person: Person,
  params: ReportParams,
  now = new Date(),
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): MyWeekGroups {
  const weekRange = getCurrentWeekRange(now);
  const completedThisWeek = listCompletedIssuesInRange(person.issues, weekRange);
  const activeIssues = getActiveIssues(person, params);

  const needsAttention: MyWeekAttentionTask[] = [];
  for (const issue of activeIssues) {
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

  const inProgress = activeIssues.filter((issue) => isInProgressStatus(issue.currentStatus || ''));
  const inReview = activeIssues.filter((issue) => isInReviewStatus(issue.currentStatus || ''));
  const atRisk = activeIssues.filter(
    (issue) => classifyTaskHealth({ issue, params, now }).status === 'at_risk',
  );

  return {
    summary: {
      completedThisWeek: completedThisWeek.length,
      currentlyActive: activeIssues.length,
      atRisk: atRisk.length,
      inReview: inReview.length,
      backflowsThisWeek: countBackflowsInRange(person.issues, weekRange),
    },
    needsAttention,
    inProgress,
    inReview,
    completedThisWeek,
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
