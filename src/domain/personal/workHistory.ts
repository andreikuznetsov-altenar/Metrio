import { formatBusinessDuration } from '../jira/dates';
import {
  getISOWeekPeriodKey,
  getMonthPeriodKey,
  getQuarterPeriodKey,
} from '../periods/dateRange';
import { extractCanonicalPerformanceCycles } from '../workflows/canonicalPerformance';
import { isAttributedCompletedCycle } from '../workflows/buildWorkflowKpi';
import { isWorkflowKpiEligible } from '../workflows/eligibility';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person } from '../people/types';

export type WorkHistoryPeriod = 'week' | 'month' | 'quarter';

export interface WorkHistoryEntry {
  completedAt: string;
  issueKey: string;
  /** One completed cycle: `<issueKey>|<completedAt>`. An issue can complete more than once. */
  cycleKey: string;
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

/**
 * Completed work for one person, built from the SAME canonical completed cycles as the person's KPI
 * (`buildWorkflowKpi` with `contributorCanonical`): a cycle is listed under its canonical owner only,
 * grouped by its completion date, and the list therefore reconciles with the KPI for the same
 * `params`. A task the person merely touched or currently holds, but whose cycle belongs to someone
 * else, is not listed.
 */
export function buildWorkHistory(
  person: Person,
  params: ReportParams,
  period: WorkHistoryPeriod,
  projectFilter?: string,
): WorkHistoryGroup[] {
  const options = { contributorCanonical: person.jira?.canonicalKey };
  const uniqueIssues = [...new Map((person.issues || []).map((issue) => [issue.issueKey, issue])).values()]
    .filter(isWorkflowKpiEligible);

  const completed: WorkHistoryEntry[] = [];
  for (const issue of uniqueIssues) {
    const project = projectFromIssue(issue);
    if (projectFilter && project !== projectFilter) continue;
    for (const cycle of extractCanonicalPerformanceCycles(issue, resolveWorkflowProfile(issue))) {
      if (!cycle.completedAt || !isAttributedCompletedCycle(cycle, params, options)) continue;
      completed.push({
        completedAt: cycle.completedAt,
        issueKey: issue.issueKey,
        cycleKey: `${issue.issueKey}|${cycle.completedAt}`,
        summary: issue.issueSummary,
        project,
        cycleMs: cycle.cycleMs,
        firstPass: cycle.backflowEventCount === 0,
        issue,
      });
    }
  }
  completed.sort((a, b) => b.completedAt.localeCompare(a.completedAt));

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
    const cycle = entry.cycleMs ? formatBusinessDuration(entry.cycleMs) : '—';
    lines.push(`- ${entry.issueKey} - ${entry.summary} (${cycle})`);
  });
  return lines.join('\n');
}
