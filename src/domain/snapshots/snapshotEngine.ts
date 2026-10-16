import { personAtRiskCount, personProblematicCount } from '../people/personDisplay';
import type { TeamSnapshot } from '../people/types';
import type { AuditReportData } from '../jira/types';
import { getLocalDateKey } from '../periods/dateRange';
import { countDailyFlowOnDate } from '../periods/issuePeriodMetrics';
import { collectUniqueTeamIssues } from '../jira/uniqueIssues';
import { getRetentionCutoffKey, pruneSnapshotsBeforeDate } from '../history/historicalFlow';
import type {
  DailyPersonSnapshot,
  DailyTeamSnapshot,
  KpiSnapshotFile,
  SnapshotSource,
} from './types';
import { KPI_SNAPSHOT_METHODOLOGY, KPI_SNAPSHOT_SCHEMA_VERSION } from './types';
import type { DailyFlowFields } from '../history/dailyFlowFields';
import { sumDailyFlow } from '../history/dailyFlowFields';
import { addCalendarDays } from '../calendar/workingCalendar';
import { MS_PER_BUSINESS_DAY } from '../jira/dates';

import { appNow } from "../../platform/appClock";
export const EMPTY_KPI_SNAPSHOT_FILE: KpiSnapshotFile = {
  schemaVersion: KPI_SNAPSHOT_SCHEMA_VERSION,
  methodology: KPI_SNAPSHOT_METHODOLOGY,
  personSnapshots: [],
  teamSnapshots: [],
};

function normalizeFlow(raw: Partial<DailyFlowFields>): DailyFlowFields {
  const completed = raw.completedOnDate ?? 0;
  const firstPass = raw.firstPassOnDate ?? 0;
  return {
    completedOnDate: completed,
    backflowsOnDate: raw.backflowsOnDate ?? 0,
    firstPassOnDate: firstPass,
    reworkedCyclesOnDate: raw.reworkedCyclesOnDate ?? Math.max(0, completed - firstPass),
    cycleMsSumOnDate: raw.cycleMsSumOnDate ?? 0,
    completedWithCycleOnDate: raw.completedWithCycleOnDate ?? 0,
    cycleMsSamplesOnDate: [...(raw.cycleMsSamplesOnDate ?? [])],
    executionMsSamplesOnDate: [...(raw.executionMsSamplesOnDate ?? [])],
  };
}

function normalizePersonSnapshot(raw: Partial<DailyPersonSnapshot>): DailyPersonSnapshot {
  const source: SnapshotSource = raw.source || 'live_daily';
  const isHistorical = source === 'historical_jira';
  return {
    date: raw.date || '',
    personId: raw.personId || '',
    source,
    activeCount: isHistorical ? null : (raw.activeCount ?? 0),
    workloadLevel: isHistorical ? null : (raw.workloadLevel || 'normal'),
    atRiskCount: isHistorical ? null : (raw.atRiskCount ?? 0),
    problematicCount: isHistorical ? null : (raw.problematicCount ?? 0),
    ...normalizeFlow(raw),
  };
}

function normalizeTeamSnapshot(raw: Partial<DailyTeamSnapshot>): DailyTeamSnapshot {
  const source: SnapshotSource = raw.source || 'live_daily';
  const isHistorical = source === 'historical_jira';
  return {
    date: raw.date || '',
    source,
    atRiskTaskCount: isHistorical ? null : (raw.atRiskTaskCount ?? 0),
    problematicTaskCount: isHistorical ? null : (raw.problematicTaskCount ?? 0),
    overloadedPeople: isHistorical ? null : (raw.overloadedPeople ?? 0),
    ...normalizeFlow(raw),
  };
}

/**
 * Loads a persisted snapshot file. Derived snapshots from any other schema version or
 * methodology stamp are INVALIDATED (returned empty), never converted: their flow values mix
 * earlier metric semantics (V1 backflow counts, host-local day buckets, mean-of-means durations)
 * and their state counts use the old Task Health rules. Raw Jira history is not stored here, so
 * the historical bootstrap rebuilds the series under the current methodology.
 */
export function migrateKpiSnapshotFile(
  raw: Partial<KpiSnapshotFile> & { schemaVersion?: number },
): KpiSnapshotFile {
  const version = raw.schemaVersion ?? 1;
  if (version !== KPI_SNAPSHOT_SCHEMA_VERSION || raw.methodology !== KPI_SNAPSHOT_METHODOLOGY) {
    return { ...EMPTY_KPI_SNAPSHOT_FILE, personSnapshots: [], teamSnapshots: [] };
  }
  return {
    schemaVersion: KPI_SNAPSHOT_SCHEMA_VERSION,
    methodology: KPI_SNAPSHOT_METHODOLOGY,
    personSnapshots: (raw.personSnapshots || []).map((snapshot) => normalizePersonSnapshot(snapshot)),
    teamSnapshots: (raw.teamSnapshots || []).map((snapshot) => normalizeTeamSnapshot(snapshot)),
    historicalCoverage: raw.historicalCoverage,
  };
}

function upsertPersonSnapshot(file: KpiSnapshotFile, snapshot: DailyPersonSnapshot): void {
  const idx = file.personSnapshots.findIndex(
    (s) => s.date === snapshot.date && s.personId === snapshot.personId,
  );
  if (idx >= 0) file.personSnapshots[idx] = snapshot;
  else file.personSnapshots.push(snapshot);
}

function upsertTeamSnapshot(file: KpiSnapshotFile, snapshot: DailyTeamSnapshot): void {
  const idx = file.teamSnapshots.findIndex((s) => s.date === snapshot.date);
  if (idx >= 0) file.teamSnapshots[idx] = snapshot;
  else file.teamSnapshots.push(snapshot);
}

export function recordDailySnapshots(
  file: KpiSnapshotFile,
  snapshot: TeamSnapshot,
  reportData: AuditReportData,
  now = appNow(),
): KpiSnapshotFile {
  const date = getLocalDateKey(now);
  const next = migrateKpiSnapshotFile(file);
  const params = reportData.params;

  const teamFlow = countDailyFlowOnDate(
    collectUniqueTeamIssues(snapshot.persons),
    date,
    params,
  );

  for (const person of snapshot.persons) {
    const dailyFlow = countDailyFlowOnDate(
      person.issues,
      date,
      params,
      person.jira?.canonicalKey,
    );
    upsertPersonSnapshot(next, {
      date,
      personId: person.id,
      source: 'live_daily',
      activeCount: person.workload?.activeCount ?? 0,
      workloadLevel: person.workload?.level || 'normal',
      atRiskCount: personAtRiskCount(person, params),
      problematicCount: personProblematicCount(person, params),
      ...dailyFlow,
    });
  }

  // Strictly Overloaded (> 100% Current workload). Heavy is a separate, lower level.
  const overloadedPeople = snapshot.persons.filter(
    (p) => (p.personalWorkload ?? p.workload)?.level === 'overloaded',
  ).length;

  let atRiskTaskCount = 0;
  let problematicTaskCount = 0;
  snapshot.persons.forEach((person) => {
    atRiskTaskCount += personAtRiskCount(person, params);
    problematicTaskCount += personProblematicCount(person, params);
  });

  upsertTeamSnapshot(next, {
    date,
    source: 'live_daily',
    atRiskTaskCount,
    problematicTaskCount,
    overloadedPeople,
    ...teamFlow,
  });

  const retentionCutoff = getRetentionCutoffKey(now);
  next.personSnapshots = pruneSnapshotsBeforeDate(next.personSnapshots, retentionCutoff);
  next.teamSnapshots = pruneSnapshotsBeforeDate(next.teamSnapshots, retentionCutoff);

  return next;
}

type FlowField =
  | 'completedOnDate'
  | 'backflowsOnDate'
  | 'firstPassOnDate'
  | 'reworkedCyclesOnDate'
  | 'cycleMsSumOnDate'
  | 'completedWithCycleOnDate';

type StateField = 'problematicCount' | 'activeCount' | 'atRiskCount';

/** Duration sums are business-time; a "day" is a business day, never 24h. */
const MS_PER_DAY = MS_PER_BUSINESS_DAY;

export function personTrendPoints(
  file: KpiSnapshotFile,
  personId: string,
  field: FlowField | StateField,
) {
  const points: { date: string; value: number }[] = [];
  for (const s of file.personSnapshots
    .filter((row) => row.personId === personId)
    .sort((a, b) => a.date.localeCompare(b.date))) {
    if (field === 'cycleMsSumOnDate') {
      points.push({ date: s.date, value: (s.cycleMsSumOnDate || 0) / MS_PER_DAY });
    } else if (field === 'problematicCount' || field === 'activeCount' || field === 'atRiskCount') {
      // State metric: a null day was never sampled. It is unknown, NOT zero.
      const value = s[field];
      if (value !== null) points.push({ date: s.date, value });
    } else {
      points.push({ date: s.date, value: s[field] });
    }
  }
  return points;
}

export function teamTrendPoints(
  file: KpiSnapshotFile,
  field: FlowField | 'problematicTaskCount' | 'overloadedPeople' | 'atRiskTaskCount',
) {
  const points: { date: string; value: number }[] = [];
  for (const s of [...file.teamSnapshots].sort((a, b) => a.date.localeCompare(b.date))) {
    if (field === 'cycleMsSumOnDate') {
      points.push({ date: s.date, value: (s.cycleMsSumOnDate || 0) / MS_PER_DAY });
    } else if (
      field === 'problematicTaskCount' ||
      field === 'overloadedPeople' ||
      field === 'atRiskTaskCount'
    ) {
      // State metric: unknown (never sampled) days are skipped, not counted as zero.
      const value = s[field];
      if (value !== null) points.push({ date: s.date, value });
    } else {
      points.push({ date: s.date, value: s[field] });
    }
  }
  return points;
}

/**
 * Daily points across all people in the file.
 *  - flow fields are summed per day (events add up);
 *  - `problematicCount` is a sampled STATE: the team total on each sampled day (sum of the
 *    people's counts), later averaged across days. Days with no sample are omitted.
 */
export function personTrendFieldPoints(
  file: KpiSnapshotFile,
  field:
    | 'completedOnDate'
    | 'firstPassOnDate'
    | 'reworkedCyclesOnDate'
    | 'backflowsOnDate'
    | 'problematicCount',
): { date: string; value: number }[] {
  const byDate = new Map<string, number>();
  if (field === 'problematicCount') {
    file.personSnapshots.forEach((snapshot) => {
      if (snapshot.problematicCount === null) return;
      byDate.set(snapshot.date, (byDate.get(snapshot.date) || 0) + snapshot.problematicCount);
    });
  } else {
    file.personSnapshots.forEach((snapshot) => {
      byDate.set(snapshot.date, (byDate.get(snapshot.date) || 0) + snapshot[field]);
    });
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

export type DurationSampleKind = 'cycle' | 'execution';

export interface DurationSamplePoint {
  date: string;
  /** Raw business-time durations (ms) of cycles completed on `date`. */
  samples: number[];
}

function samplesOf(row: DailyFlowFields, kind: DurationSampleKind): number[] {
  return kind === 'cycle' ? row.cycleMsSamplesOnDate : row.executionMsSamplesOnDate;
}

export function teamDurationSamplePoints(
  file: KpiSnapshotFile,
  kind: DurationSampleKind,
): DurationSamplePoint[] {
  return [...file.teamSnapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ date: row.date, samples: samplesOf(row, kind) }));
}

export function personDurationSamplePoints(
  file: KpiSnapshotFile,
  personId: string,
  kind: DurationSampleKind,
): DurationSamplePoint[] {
  return file.personSnapshots
    .filter((row) => row.personId === personId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ date: row.date, samples: samplesOf(row, kind) }));
}

/** Pooled samples of every person in the file, per day (samples are pooled, never averaged). */
export function peopleDurationSamplePoints(
  file: KpiSnapshotFile,
  kind: DurationSampleKind,
): DurationSamplePoint[] {
  const byDate = new Map<string, DailyFlowFields[]>();
  for (const row of file.personSnapshots) {
    byDate.set(row.date, [...(byDate.get(row.date) ?? []), row]);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rows]) => ({ date, samples: samplesOf(sumDailyFlow(rows), kind) }));
}

/** Sparkline data for last N days of flow metrics. */
export function personSparklinePoints(
  file: KpiSnapshotFile,
  personId: string,
  field: FlowField,
  days = 56,
  now = appNow(),
): { date: string; value: number }[] {
  const cutoffKey = addCalendarDays(getLocalDateKey(now), -Math.max(0, days - 1));
  const endKey = getLocalDateKey(now);
  return personTrendPoints(file, personId, field).filter(
    (p) => p.date >= cutoffKey && p.date <= endKey,
  );
}

export function teamSparklinePoints(
  file: KpiSnapshotFile,
  field: FlowField,
  days = 56,
  now = appNow(),
): { date: string; value: number }[] {
  const cutoffKey = addCalendarDays(getLocalDateKey(now), -Math.max(0, days - 1));
  const endKey = getLocalDateKey(now);
  return teamTrendPoints(file, field).filter(
    (p) => p.date >= cutoffKey && p.date <= endKey,
  );
}
