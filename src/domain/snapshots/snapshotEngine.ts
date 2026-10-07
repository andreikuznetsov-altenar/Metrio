import { personAtRiskCount, personProblematicCount } from '../people/personDisplay';
import type { TeamSnapshot } from '../people/types';
import type { AuditReportData } from '../jira/types';
import { getLocalDateKey } from '../periods/dateRange';
import { countDailyFlowOnDate } from '../periods/issuePeriodMetrics';
import { getRetentionCutoffKey, pruneSnapshotsBeforeDate } from '../history/historicalFlow';
import type {
  DailyPersonSnapshot,
  DailyTeamSnapshot,
  KpiSnapshotFile,
  LegacyDailyPersonSnapshot,
  SnapshotSource,
} from './types';
import { KPI_SNAPSHOT_SCHEMA_VERSION } from './types';

export const EMPTY_KPI_SNAPSHOT_FILE: KpiSnapshotFile = {
  schemaVersion: KPI_SNAPSHOT_SCHEMA_VERSION,
  personSnapshots: [],
  teamSnapshots: [],
};

function normalizePersonSnapshot(
  raw: Partial<DailyPersonSnapshot> & LegacyDailyPersonSnapshot,
): DailyPersonSnapshot {
  const source: SnapshotSource = raw.source || 'live_daily';
  const isHistorical = source === 'historical_jira';
  return {
    date: raw.date,
    personId: raw.personId,
    source,
    activeCount: isHistorical ? null : (raw.activeCount ?? 0),
    workloadLevel: isHistorical ? null : (raw.workloadLevel || 'normal'),
    atRiskCount: isHistorical ? null : (raw.atRiskCount ?? 0),
    problematicCount: isHistorical ? null : (raw.problematicCount ?? 0),
    completedOnDate: raw.completedOnDate ?? 0,
    backflowsOnDate: raw.backflowsOnDate ?? 0,
    firstPassOnDate: raw.firstPassOnDate ?? 0,
    cycleMsSumOnDate: raw.cycleMsSumOnDate ?? 0,
    completedWithCycleOnDate: raw.completedWithCycleOnDate ?? 0,
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
    completedOnDate: raw.completedOnDate ?? 0,
    backflowsOnDate: raw.backflowsOnDate ?? 0,
    firstPassOnDate: raw.firstPassOnDate ?? 0,
    cycleMsSumOnDate: raw.cycleMsSumOnDate ?? 0,
    completedWithCycleOnDate: raw.completedWithCycleOnDate ?? 0,
  };
}

function migrateV2ToV3(file: KpiSnapshotFile): KpiSnapshotFile {
  return {
    ...file,
    schemaVersion: KPI_SNAPSHOT_SCHEMA_VERSION,
    personSnapshots: file.personSnapshots.map((snapshot) => ({
      ...snapshot,
      source: snapshot.source || 'live_daily',
      activeCount: snapshot.activeCount ?? 0,
      workloadLevel: snapshot.workloadLevel ?? 'normal',
      atRiskCount: snapshot.atRiskCount ?? 0,
      problematicCount: snapshot.problematicCount ?? 0,
    })),
    teamSnapshots: file.teamSnapshots.map((snapshot) => ({
      ...snapshot,
      source: snapshot.source || 'live_daily',
      atRiskTaskCount: snapshot.atRiskTaskCount ?? 0,
      problematicTaskCount: snapshot.problematicTaskCount ?? 0,
      overloadedPeople: snapshot.overloadedPeople ?? 0,
    })),
  };
}

/**
 * Pre-v4 snapshots contain derived workflow/workload values that cannot be
 * recomputed safely without the raw Jira history, so they are invalidated.
 */
export function migrateKpiSnapshotFile(
  raw: Partial<KpiSnapshotFile> & { schemaVersion?: number },
): KpiSnapshotFile {
  const version = raw.schemaVersion ?? 1;
  // Pre-v4 files contain workload/current-state and flow values derived with
  // legacy raw-status semantics. There is no raw Jira history in this file
  // from which they can be repaired, so invalidate only this derived cache.
  if (version < 4) {
    return { ...EMPTY_KPI_SNAPSHOT_FILE };
  }
  const personSnapshots = (raw.personSnapshots || []).map((snapshot) =>
    normalizePersonSnapshot(snapshot as LegacyDailyPersonSnapshot & Partial<DailyPersonSnapshot>),
  );
  const teamSnapshots = (raw.teamSnapshots || []).map((snapshot) => normalizeTeamSnapshot(snapshot));

  let file: KpiSnapshotFile = {
    schemaVersion: version,
    personSnapshots,
    teamSnapshots,
    historicalCoverage: raw.historicalCoverage,
  };

  if (version < 2) {
    file = {
      schemaVersion: 2,
      personSnapshots: personSnapshots.map((snapshot) => ({
        ...snapshot,
        source: 'live_daily',
        completedOnDate: 0,
        backflowsOnDate: 0,
        firstPassOnDate: 0,
        cycleMsSumOnDate: 0,
        completedWithCycleOnDate: 0,
      })),
      teamSnapshots: teamSnapshots.map((snapshot) => ({
        ...snapshot,
        source: 'live_daily',
        completedOnDate: 0,
        backflowsOnDate: 0,
        firstPassOnDate: 0,
        cycleMsSumOnDate: 0,
        completedWithCycleOnDate: 0,
      })),
    };
  }

  if (file.schemaVersion < KPI_SNAPSHOT_SCHEMA_VERSION) {
    file = migrateV2ToV3(file);
  }

  return {
    ...file,
    schemaVersion: KPI_SNAPSHOT_SCHEMA_VERSION,
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
  now = new Date(),
): KpiSnapshotFile {
  const date = getLocalDateKey(now);
  const next = migrateKpiSnapshotFile(file);
  const params = reportData.params;

  let teamFlow = {
    completedOnDate: 0,
    backflowsOnDate: 0,
    firstPassOnDate: 0,
    cycleMsSumOnDate: 0,
    completedWithCycleOnDate: 0,
  };

  for (const person of snapshot.persons) {
    const dailyFlow = countDailyFlowOnDate(person.issues, date, params);
    teamFlow = {
      completedOnDate: teamFlow.completedOnDate + dailyFlow.completedOnDate,
      backflowsOnDate: teamFlow.backflowsOnDate + dailyFlow.backflowsOnDate,
      firstPassOnDate: teamFlow.firstPassOnDate + dailyFlow.firstPassOnDate,
      cycleMsSumOnDate: teamFlow.cycleMsSumOnDate + dailyFlow.cycleMsSumOnDate,
      completedWithCycleOnDate:
        teamFlow.completedWithCycleOnDate + dailyFlow.completedWithCycleOnDate,
    };

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

  const overloadedPeople = snapshot.persons.filter(
    (p) => p.workload?.level === 'overloaded' || p.workload?.level === 'high',
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
  | 'cycleMsSumOnDate'
  | 'completedWithCycleOnDate';

type StateField = 'problematicCount' | 'activeCount' | 'atRiskCount';

export function personTrendPoints(
  file: KpiSnapshotFile,
  personId: string,
  field: FlowField | StateField,
) {
  return file.personSnapshots
    .filter((s) => s.personId === personId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      let value: number;
      if (field === 'cycleMsSumOnDate') {
        value = (s.cycleMsSumOnDate || 0) / (24 * 60 * 60 * 1000);
      } else if (field === 'problematicCount' || field === 'activeCount' || field === 'atRiskCount') {
        value = s[field] ?? 0;
      } else {
        value = s[field];
      }
      return { date: s.date, value };
    });
}

export function teamTrendPoints(
  file: KpiSnapshotFile,
  field: FlowField | 'problematicTaskCount' | 'overloadedPeople' | 'atRiskTaskCount',
) {
  return file.teamSnapshots
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      let value: number;
      if (field === 'cycleMsSumOnDate') {
        value = (s.cycleMsSumOnDate || 0) / (24 * 60 * 60 * 1000);
      } else if (
        field === 'problematicTaskCount' ||
        field === 'overloadedPeople' ||
        field === 'atRiskTaskCount'
      ) {
        value = s[field] ?? 0;
      } else {
        value = s[field];
      }
      return { date: s.date, value };
    });
}

export function personTrendFieldPoints(
  file: KpiSnapshotFile,
  field: 'completedOnDate' | 'firstPassOnDate' | 'backflowsOnDate' | 'problematicCount',
): { date: string; value: number }[] {
  if (field === 'problematicCount') {
    const byDate = new Map<string, { sum: number; count: number }>();
    file.personSnapshots.forEach((snapshot) => {
      if (snapshot.problematicCount === null) return;
      const entry = byDate.get(snapshot.date) || { sum: 0, count: 0 };
      entry.sum += snapshot.problematicCount;
      entry.count += 1;
      byDate.set(snapshot.date, entry);
    });
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, { sum, count }]) => ({ date, value: count > 0 ? sum / count : 0 }));
  }

  const byDate = new Map<string, number>();
  file.personSnapshots.forEach((snapshot) => {
    byDate.set(snapshot.date, (byDate.get(snapshot.date) || 0) + snapshot[field]);
  });
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

/** Sparkline data for last N days of flow metrics. */
export function personSparklinePoints(
  file: KpiSnapshotFile,
  personId: string,
  field: FlowField,
  days = 56,
  now = new Date(),
): { date: string; value: number }[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
  const cutoffKey = getLocalDateKey(cutoff);
  const endKey = getLocalDateKey(now);
  return personTrendPoints(file, personId, field).filter(
    (p) => p.date >= cutoffKey && p.date <= endKey,
  );
}

export function teamSparklinePoints(
  file: KpiSnapshotFile,
  field: FlowField,
  days = 56,
  now = new Date(),
): { date: string; value: number }[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
  const cutoffKey = getLocalDateKey(cutoff);
  const endKey = getLocalDateKey(now);
  return teamTrendPoints(file, field).filter(
    (p) => p.date >= cutoffKey && p.date <= endKey,
  );
}
