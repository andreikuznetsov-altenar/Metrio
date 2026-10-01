import { formatDuration } from '../jira/dates';
import {
  getISOWeekPeriodKey,
  getMonthPeriodKey,
  getQuarterPeriodKey,
} from '../periods/dateRange';
import { getIssueCompletionAt, getIssueFullCycleMs, withFullIssueHistory } from '../periods/issueCompletion';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person } from '../people/types';

export type WorkHistoryPeriod = 'week' | 'month' | 'quarter';

export interface WorkHistoryEntry {
  completedAt: string;
  issueKey: string;
  summary: string;
  project: string;
  cycleMs: number | null;
  firstPass: boolean | null;
  issue: AuditIssue;
}

export interface WorkHistoryGroup {
  label: string;
  entries: WorkHistoryEntry[];
  completedCount: number;
  firstPassCount: number;
  reviewReturns: number;
}

function projectFromIssue(issue: AuditIssue): string {
  const key = issue.issueKey || '';
  const idx = key.indexOf('-');
  return idx > 0 ? key.slice(0, idx) : '—';
}

function periodKey(dateIso: string, period: WorkHistoryPeriod): string {
  if (period === 'week') return getISOWeekPeriodKey(dateIso);
  if (period === 'month') return getMonthPeriodKey(dateIso);
  return getQuarterPeriodKey(dateIso);
}

export function buildWorkHistory(
  person: Person,
  params: ReportParams,
  period: WorkHistoryPeriod,
  projectFilter?: string,
): WorkHistoryGroup[] {
  const completed = person.issues
    .map((issue) => {
      const fullIssue = withFullIssueHistory(issue);
      const health = classifyTaskHealth({ issue: fullIssue, params });
      if (!health.isCompleted) return null;

      const completedAt = getIssueCompletionAt(fullIssue);
      if (!completedAt) return null;

      const project = projectFromIssue(issue);
      if (projectFilter && project !== projectFilter) return null;

      const entry: WorkHistoryEntry = {
        completedAt,
        issueKey: issue.issueKey,
        summary: issue.issueSummary,
        project,
        cycleMs: getIssueFullCycleMs(fullIssue),
        firstPass: health.isFirstPass,
        issue,
      };
      return entry;
    })
    .filter((entry): entry is WorkHistoryEntry => entry !== null)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const groups = new Map<string, WorkHistoryEntry[]>();
  for (const entry of completed) {
    const key = periodKey(entry.completedAt, period);
    const bucket = groups.get(key) || [];
    bucket.push(entry);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([label, entries]) => ({
      label,
      entries,
      completedCount: entries.length,
      firstPassCount: entries.filter((e) => e.firstPass).length,
      reviewReturns: entries.filter((e) => e.firstPass === false).length,
    }));
}

export function formatMonthlyWorkHistorySummary(group: WorkHistoryGroup, monthLabel: string): string {
  const lines = [
    monthLabel,
    '',
    `${group.completedCount} tasks completed`,
    `${group.firstPassCount} first-pass`,
    `${group.reviewReturns} review returns`,
    '',
    'Selected work:',
  ];
  group.entries.slice(0, 10).forEach((entry) => {
    const cycle = entry.cycleMs ? formatDuration(entry.cycleMs) : '—';
    lines.push(`- ${entry.issueKey} - ${entry.summary} (${cycle})`);
  });
  return lines.join('\n');
}
