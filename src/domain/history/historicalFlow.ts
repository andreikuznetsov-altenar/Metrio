import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import { collectUniqueTeamIssues } from '../jira/uniqueIssues';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import { getOperationalIssues } from '../people/ownedIssues';
import { getLocalDateKey } from '../periods/dateRange';
import {
  getIssueCompletionAt,
  getIssueFullCycleMs,
  withFullIssueHistory,
} from '../periods/issueCompletion';
import { isProfileBackflow } from '../workflows/profileCycles';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import type { DailyPersonSnapshot, DailyTeamSnapshot } from '../snapshots/types';
import { resolveRequiredComparisonCoverage } from './historyRanges';
import { SNAPSHOT_RETENTION_DAYS } from './constants';

export interface DailyFlowFields {
  completedOnDate: number;
  backflowsOnDate: number;
  firstPassOnDate: number;
  cycleMsSumOnDate: number;
  completedWithCycleOnDate: number;
}

export const EMPTY_DAILY_FLOW: DailyFlowFields = {
  completedOnDate: 0,
  backflowsOnDate: 0,
  firstPassOnDate: 0,
  cycleMsSumOnDate: 0,
  completedWithCycleOnDate: 0,
};

/** Enumerate local calendar date keys from start through end (inclusive). */
export function enumerateLocalDateKeys(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const start = new Date(`${startKey}T12:00:00`);
  const end = new Date(`${endKey}T12:00:00`);
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    keys.push(getLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function getBootstrapDateRange(
  reportParams: ReportParams,
  now = new Date(),
): { startKey: string; endKey: string } {
  const endKey = reportParams.dateTo || getLocalDateKey(now);
  const displayFrom = reportParams.dateFrom || endKey;
  const coverage = resolveRequiredComparisonCoverage(
    { from: displayFrom, to: endKey, preset: 'custom' },
    now,
  );
  return {
    startKey: coverage.requiredFetchStart,
    endKey: coverage.requiredFetchEnd,
  };
}

/**
 * Index flow events from issues into daily buckets in a single pass.
 * Avoids O(issues × days) repeated scans.
 */
export function indexPersonDailyFlow(
  issues: AuditIssue[],
  dateKeys: string[],
  params: ReportParams,
): Map<string, DailyFlowFields> {
  const buckets = new Map<string, DailyFlowFields>();
  for (const key of dateKeys) {
    buckets.set(key, { ...EMPTY_DAILY_FLOW });
  }

  const minTs = Date.parse(`${dateKeys[0]}T00:00:00`);
  const maxTs = Date.parse(`${dateKeys[dateKeys.length - 1]}T23:59:59.999`);

  for (const issue of issues) {
    const fullIssue = withFullIssueHistory(issue);
    const profile = resolveWorkflowProfile(fullIssue);

    for (const event of fullIssue.events || []) {
      if (
        event.eventType === 'Status' &&
        isProfileBackflow(profile, event.fromValue, event.toValue, event)
      ) {
        const ts = Date.parse(event.changedAt);
        if (ts >= minTs && ts <= maxTs) {
          const key = getLocalDateKey(new Date(event.changedAt));
          const bucket = buckets.get(key);
          if (bucket) bucket.backflowsOnDate += 1;
        }
      }
    }

    const completedAt = getIssueCompletionAt(fullIssue);
    if (!completedAt) continue;

    const completionKey = getLocalDateKey(new Date(completedAt));
    const bucket = buckets.get(completionKey);
    if (!bucket) continue;

    bucket.completedOnDate += 1;
    const health = classifyTaskHealth({ issue: fullIssue, params });
    if (health.isFirstPass) bucket.firstPassOnDate += 1;
    const cycleMs = getIssueFullCycleMs(fullIssue);
    if (cycleMs !== null) {
      bucket.cycleMsSumOnDate += cycleMs;
      bucket.completedWithCycleOnDate += 1;
    }
  }

  return buckets;
}

export function buildHistoricalPersonSnapshots(
  person: Person,
  dateKeys: string[],
  params: ReportParams,
): DailyPersonSnapshot[] {
  const buckets = indexPersonDailyFlow(getOperationalIssues(person), dateKeys, params);
  return dateKeys.map((date) => {
    const flow = buckets.get(date) || EMPTY_DAILY_FLOW;
    return {
      date,
      personId: person.id,
      source: 'historical_jira' as const,
      activeCount: null,
      workloadLevel: null,
      atRiskCount: null,
      problematicCount: null,
      ...flow,
    };
  });
}

/** @deprecated Team snapshots must use unique issues — see buildHistoricalTeamSnapshots. */
export function aggregateTeamFlowFromPersons(
  personSnapshots: DailyPersonSnapshot[],
  dateKeys: string[],
): DailyTeamSnapshot[] {
  return dateKeys.map((date) => {
    const dayPersons = personSnapshots.filter((s) => s.date === date);
    const flow = dayPersons.reduce(
      (acc, s) => ({
        completedOnDate: acc.completedOnDate + s.completedOnDate,
        backflowsOnDate: acc.backflowsOnDate + s.backflowsOnDate,
        firstPassOnDate: acc.firstPassOnDate + s.firstPassOnDate,
        cycleMsSumOnDate: acc.cycleMsSumOnDate + s.cycleMsSumOnDate,
        completedWithCycleOnDate: acc.completedWithCycleOnDate + s.completedWithCycleOnDate,
      }),
      { ...EMPTY_DAILY_FLOW },
    );

    return {
      date,
      source: 'historical_jira' as const,
      atRiskTaskCount: null,
      problematicTaskCount: null,
      overloadedPeople: null,
      ...flow,
    };
  });
}

/** Team historical flow from unique issues — each Jira issue counted once per day. */
export function buildHistoricalTeamSnapshots(
  uniqueIssues: AuditIssue[],
  dateKeys: string[],
  params: ReportParams,
): DailyTeamSnapshot[] {
  const buckets = indexPersonDailyFlow(uniqueIssues, dateKeys, params);
  return dateKeys.map((date) => ({
    date,
    source: 'historical_jira' as const,
    atRiskTaskCount: null,
    problematicTaskCount: null,
    overloadedPeople: null,
    ...(buckets.get(date) || EMPTY_DAILY_FLOW),
  }));
}

export function buildHistoricalTeamSnapshotsFromPersons(
  persons: Person[],
  dateKeys: string[],
  params: ReportParams,
): DailyTeamSnapshot[] {
  return buildHistoricalTeamSnapshots(collectUniqueTeamIssues(persons), dateKeys, params);
}

export function pruneSnapshotsBeforeDate<T extends { date: string }>(
  snapshots: T[],
  cutoffKey: string,
): T[] {
  return snapshots.filter((s) => s.date >= cutoffKey);
}

export function getRetentionCutoffKey(now = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - SNAPSHOT_RETENTION_DAYS);
  return getLocalDateKey(cutoff);
}

export function buildHistoryScopeKey(input: {
  personIds: string[];
  projects: string[];
  scopeType: 'full' | 'direct';
}): string {
  const sortedPeople = [...input.personIds].sort().join(',');
  const sortedProjects = [...input.projects].sort().join(',');
  return `${input.scopeType}|${sortedProjects}|${sortedPeople}`;
}
