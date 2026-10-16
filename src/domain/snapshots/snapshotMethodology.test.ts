import { describe, expect, it } from 'vitest';
import { emptyDailyFlow } from '../history/dailyFlowFields';
import {
  migrateKpiSnapshotFile,
  personTrendFieldPoints,
  teamDurationSamplePoints,
  teamTrendPoints,
} from './snapshotEngine';
import {
  KPI_SNAPSHOT_METHODOLOGY,
  KPI_SNAPSHOT_SCHEMA_VERSION,
  type DailyPersonSnapshot,
  type DailyTeamSnapshot,
  type KpiSnapshotFile,
} from './types';

function teamRow(date: string, overrides: Partial<DailyTeamSnapshot> = {}): DailyTeamSnapshot {
  return {
    date,
    source: 'historical_jira',
    atRiskTaskCount: null,
    problematicTaskCount: null,
    overloadedPeople: null,
    ...emptyDailyFlow(),
    ...overrides,
  };
}

function personRow(date: string, personId: string, overrides: Partial<DailyPersonSnapshot> = {}): DailyPersonSnapshot {
  return {
    date,
    personId,
    source: 'live_daily',
    activeCount: null,
    workloadLevel: null,
    atRiskCount: null,
    problematicCount: null,
    ...emptyDailyFlow(),
    ...overrides,
  };
}

describe('KPI snapshot methodology stamp', () => {
  const current: KpiSnapshotFile = {
    schemaVersion: KPI_SNAPSHOT_SCHEMA_VERSION,
    methodology: KPI_SNAPSHOT_METHODOLOGY,
    personSnapshots: [personRow('2026-10-15', 'p1', { problematicCount: 2 })],
    teamSnapshots: [teamRow('2026-10-15', { completedOnDate: 3 })],
  };

  it('keeps rows that carry the current schema and methodology', () => {
    const loaded = migrateKpiSnapshotFile(current);
    expect(loaded.schemaVersion).toBe(KPI_SNAPSHOT_SCHEMA_VERSION);
    expect(loaded.methodology).toBe(KPI_SNAPSHOT_METHODOLOGY);
    expect(loaded.teamSnapshots).toHaveLength(1);
    expect(loaded.personSnapshots).toHaveLength(1);
  });

  it('invalidates every older schema instead of mixing it into V2 trends', () => {
    for (const schemaVersion of [1, 2, 3, 4, 5, 6]) {
      const loaded = migrateKpiSnapshotFile({ ...current, schemaVersion, methodology: undefined });
      expect(loaded.teamSnapshots).toEqual([]);
      expect(loaded.personSnapshots).toEqual([]);
      expect(loaded.schemaVersion).toBe(KPI_SNAPSHOT_SCHEMA_VERSION);
      expect(loaded.methodology).toBe(KPI_SNAPSHOT_METHODOLOGY);
    }
  });

  it('invalidates the current schema when the methodology stamp is missing or different', () => {
    expect(migrateKpiSnapshotFile({ ...current, methodology: undefined }).teamSnapshots).toEqual([]);
    expect(migrateKpiSnapshotFile({ ...current, methodology: 'metrics-v1' }).teamSnapshots).toEqual([]);
  });

  it('keeps unknown state as null — it is never converted to a known zero', () => {
    const loaded = migrateKpiSnapshotFile({
      ...current,
      teamSnapshots: [
        teamRow('2026-10-14'),
        teamRow('2026-10-15', { source: 'live_daily', problematicTaskCount: 0 }),
      ],
    });
    expect(loaded.teamSnapshots[0]!.problematicTaskCount).toBeNull();
    expect(loaded.teamSnapshots[1]!.problematicTaskCount).toBe(0);
    // Unknown days are skipped by the trend series; known zeros are kept.
    expect(teamTrendPoints(loaded, 'problematicTaskCount')).toEqual([{ date: '2026-10-15', value: 0 }]);
  });

  it('team state series totals people on sampled days only', () => {
    const file: KpiSnapshotFile = {
      ...current,
      personSnapshots: [
        personRow('2026-10-14', 'a', { problematicCount: 2 }),
        personRow('2026-10-14', 'b', { problematicCount: 1 }),
        personRow('2026-10-15', 'a', { problematicCount: null }),
        personRow('2026-10-15', 'b', { problematicCount: null }),
      ],
    };
    expect(personTrendFieldPoints(file, 'problematicCount')).toEqual([{ date: '2026-10-14', value: 3 }]);
  });

  it('exposes raw duration samples for sample-aware trends', () => {
    const file: KpiSnapshotFile = {
      ...current,
      teamSnapshots: [teamRow('2026-10-15', { cycleMsSamplesOnDate: [1, 2, 3], executionMsSamplesOnDate: [4] })],
    };
    expect(teamDurationSamplePoints(file, 'cycle')).toEqual([{ date: '2026-10-15', samples: [1, 2, 3] }]);
    expect(teamDurationSamplePoints(file, 'execution')).toEqual([{ date: '2026-10-15', samples: [4] }]);
  });
});
