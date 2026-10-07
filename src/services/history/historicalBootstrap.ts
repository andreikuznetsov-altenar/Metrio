import type { TeamSnapshot } from '../../domain/people/types';
import type { AuditReportData } from '../../domain/jira/types';
import { addDays, format, parseISO } from 'date-fns';
import {
  buildHistoricalPersonSnapshots,
  buildHistoricalTeamSnapshotsFromPersons,
  buildHistoryScopeKey,
  enumerateLocalDateKeys,
  getBootstrapDateRange,
  getRetentionCutoffKey,
  pruneSnapshotsBeforeDate,
} from '../../domain/history/historicalFlow';
import { HISTORICAL_BOOTSTRAP_VERSION } from '../../domain/history/constants';
import { migrateKpiSnapshotFile } from '../../domain/snapshots/snapshotEngine';
import type { KpiSnapshotFile } from '../../domain/snapshots/types';

export interface BootstrapProgress {
  stage: string;
  current: number;
  total: number;
}

export function needsHistoricalBootstrap(
  file: KpiSnapshotFile,
  scopeKey: string,
  requiredCoverage?: { startKey: string; endKey: string },
): boolean {
  const coverage = file.historicalCoverage;
  if (!coverage) return true;
  if (coverage.scopeKey !== scopeKey) return true;
  if (coverage.bootstrapVersion < HISTORICAL_BOOTSTRAP_VERSION) return true;
  if (coverage.bootstrapStatus !== 'complete') return true;
  if (!coverage.coverageStart || !coverage.coverageEnd) return true;
  if (
    requiredCoverage &&
    (coverage.coverageStart > requiredCoverage.startKey ||
      coverage.coverageEnd < requiredCoverage.endKey)
  ) {
    return true;
  }

  if (requiredCoverage) {
    const requiredDays = enumerateLocalDateKeys(
      requiredCoverage.startKey,
      requiredCoverage.endKey,
    );
    const recordedTeamDays = new Set(
      file.teamSnapshots
        .filter(
          (snapshot) =>
            snapshot.date >= requiredCoverage.startKey &&
            snapshot.date <= requiredCoverage.endKey,
        )
        .map((snapshot) => snapshot.date),
    );
    if (requiredDays.some((date) => !recordedTeamDays.has(date))) return true;
  } else {
    const hasHistorical = file.personSnapshots.some((s) => s.source === 'historical_jira');
    if (!hasHistorical) return true;
  }

  return false;
}

export function buildScopeKeyFromSnapshot(
  snapshot: TeamSnapshot,
  reportData: AuditReportData,
): string {
  return buildHistoryScopeKey({
    personIds: snapshot.persons.map((p) => p.id),
    projects: reportData.params.projects,
    scopeType: reportData.params.teamScope || 'full',
  });
}

function upsertHistoricalSnapshots(
  file: KpiSnapshotFile,
  newPersonSnapshots: ReturnType<typeof buildHistoricalPersonSnapshots>,
  newTeamSnapshots: ReturnType<typeof buildHistoricalTeamSnapshotsFromPersons>,
): void {
  for (const snapshot of newPersonSnapshots) {
    const idx = file.personSnapshots.findIndex(
      (s) => s.date === snapshot.date && s.personId === snapshot.personId,
    );
    if (idx >= 0) {
      const existing = file.personSnapshots[idx];
      if (existing.source === 'live_daily') continue;
      file.personSnapshots[idx] = snapshot;
    } else {
      file.personSnapshots.push(snapshot);
    }
  }

  for (const snapshot of newTeamSnapshots) {
    const idx = file.teamSnapshots.findIndex((s) => s.date === snapshot.date);
    if (idx >= 0) {
      const existing = file.teamSnapshots[idx];
      if (existing.source === 'live_daily') {
        file.teamSnapshots[idx] = {
          ...existing,
          completedOnDate: existing.completedOnDate || snapshot.completedOnDate,
          backflowsOnDate: existing.backflowsOnDate || snapshot.backflowsOnDate,
          firstPassOnDate: existing.firstPassOnDate || snapshot.firstPassOnDate,
          cycleMsSumOnDate: existing.cycleMsSumOnDate || snapshot.cycleMsSumOnDate,
          completedWithCycleOnDate:
            existing.completedWithCycleOnDate || snapshot.completedWithCycleOnDate,
        };
      } else {
        file.teamSnapshots[idx] = snapshot;
      }
    } else {
      file.teamSnapshots.push(snapshot);
    }
  }
}

export function runHistoricalBootstrap(
  file: KpiSnapshotFile,
  historySnapshot: TeamSnapshot,
  reportData: AuditReportData,
  options?: {
    now?: Date;
    onProgress?: (progress: BootstrapProgress) => void;
    shouldAbort?: () => boolean;
  },
): KpiSnapshotFile {
  const now = options?.now || new Date();
  const next = migrateKpiSnapshotFile(file);
  const params = reportData.params;
  const requested = getBootstrapDateRange(params, now);
  const scopeKey = buildScopeKeyFromSnapshot(historySnapshot, reportData);
  const scopeType = params.teamScope || 'full';
  const compatibleCoverage =
    next.historicalCoverage?.scopeKey === scopeKey &&
    next.historicalCoverage.bootstrapVersion === HISTORICAL_BOOTSTRAP_VERSION;
  const existingStart = next.historicalCoverage?.coverageStart;
  const existingEnd = next.historicalCoverage?.coverageEnd;
  const canExtendCoverage =
    compatibleCoverage &&
    !!existingStart &&
    !!existingEnd &&
    requested.startKey <= format(addDays(parseISO(existingEnd), 1), 'yyyy-MM-dd') &&
    requested.endKey >= format(addDays(parseISO(existingStart), -1), 'yyyy-MM-dd');

  if (!canExtendCoverage) {
    next.personSnapshots = next.personSnapshots.filter((s) => s.source === 'live_daily');
    next.teamSnapshots = next.teamSnapshots.filter((s) => s.source === 'live_daily');
  }

  const unionStart =
    canExtendCoverage &&
    existingStart &&
    existingStart < requested.startKey
      ? existingStart
      : requested.startKey;
  const unionEnd =
    canExtendCoverage &&
    existingEnd &&
    existingEnd > requested.endKey
      ? existingEnd
      : requested.endKey;
  const retentionAnchor = new Date(`${unionEnd}T12:00:00`);
  const retentionCutoff = getRetentionCutoffKey(retentionAnchor);
  const coverageStart = unionStart < retentionCutoff ? retentionCutoff : unionStart;
  const buildStart =
    requested.startKey < retentionCutoff ? retentionCutoff : requested.startKey;
  const dateKeys = enumerateLocalDateKeys(buildStart, requested.endKey);

  const allPersonSnapshots: ReturnType<typeof buildHistoricalPersonSnapshots> = [];
  const total = historySnapshot.persons.length;

  historySnapshot.persons.forEach((person, index) => {
    if (options?.shouldAbort?.()) return;
    options?.onProgress?.({
      stage: 'Preparing historical trends…',
      current: index + 1,
      total,
    });
    allPersonSnapshots.push(...buildHistoricalPersonSnapshots(person, dateKeys, params));
  });

  const teamSnapshots = buildHistoricalTeamSnapshotsFromPersons(
    historySnapshot.persons,
    dateKeys,
    params,
  );
  upsertHistoricalSnapshots(next, allPersonSnapshots, teamSnapshots);

  next.personSnapshots = pruneSnapshotsBeforeDate(next.personSnapshots, retentionCutoff);
  next.teamSnapshots = pruneSnapshotsBeforeDate(next.teamSnapshots, retentionCutoff);

  next.historicalCoverage = {
    scopeKey,
    coverageStart,
    coverageEnd: unionEnd,
    bootstrapAt: now.toISOString(),
    bootstrapVersion: HISTORICAL_BOOTSTRAP_VERSION,
    bootstrapStatus: 'complete',
    personCount: historySnapshot.persons.length,
    projectCount: params.projects.length,
    scopeType,
  };

  return next;
}

export function clearHistoricalBootstrap(file: KpiSnapshotFile): KpiSnapshotFile {
  const next = migrateKpiSnapshotFile(file);
  next.personSnapshots = next.personSnapshots.filter((s) => s.source === 'live_daily');
  next.teamSnapshots = next.teamSnapshots.filter((s) => s.source === 'live_daily');
  next.historicalCoverage = undefined;
  return next;
}

export function getHistoryCoverageLabel(file: KpiSnapshotFile): string | null {
  const coverage = file.historicalCoverage;
  if (!coverage?.coverageStart || !coverage.coverageEnd) return null;
  return `${coverage.coverageStart} – ${coverage.coverageEnd}`;
}

export function getHistoryCoverageSummary(file: KpiSnapshotFile): {
  label: string;
  partial: boolean;
  daysAvailable: number;
  daysExpected: number;
} | null {
  const coverage = file.historicalCoverage;
  if (!coverage?.coverageStart) return null;
  const coverageStart = coverage.coverageStart;
  const coverageEnd = coverage.coverageEnd || coverageStart;

  const expected = enumerateLocalDateKeys(
    coverageStart,
    coverageEnd,
  ).length;

  const flowDays = new Set(
    file.teamSnapshots
      .filter(
        (s) =>
          (s.source === 'historical_jira' || s.source === 'live_daily') &&
          s.date >= coverageStart &&
          s.date <= coverageEnd,
      )
      .map((s) => s.date),
  ).size;

  const partial = flowDays < expected;
  const label = partial
    ? `Partial history · ${flowDays} of ${expected} days available`
    : getHistoryCoverageLabel(file) || '';

  return { label, partial, daysAvailable: flowDays, daysExpected: expected };
}
