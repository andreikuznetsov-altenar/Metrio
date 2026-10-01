import { describe, expect, it } from 'vitest';
import { HISTORICAL_BOOTSTRAP_VERSION } from '../../domain/history/constants';
import { needsHistoricalBootstrap } from './historicalBootstrap';
import type { KpiSnapshotFile } from '../../domain/snapshots/types';

function fileWithVersion(version: number): KpiSnapshotFile {
  return {
    schemaVersion: 3,
    personSnapshots: [
      {
        date: '2026-01-01',
        personId: '1',
        source: 'historical_jira',
        activeCount: null,
        workloadLevel: null,
        atRiskCount: null,
        problematicCount: null,
        completedOnDate: 1,
        backflowsOnDate: 0,
        firstPassOnDate: 1,
        cycleMsSumOnDate: 0,
        completedWithCycleOnDate: 0,
      },
    ],
    teamSnapshots: [],
    historicalCoverage: {
      scopeKey: 'full||1',
      coverageStart: '2026-01-01',
      coverageEnd: '2026-03-01',
      bootstrapAt: '2026-03-01T00:00:00.000Z',
      bootstrapVersion: version,
      bootstrapStatus: 'complete',
      personCount: 1,
      projectCount: 0,
      scopeType: 'full',
    },
  };
}

describe('needsHistoricalBootstrap', () => {
  it('requires rebuild when bootstrap version is obsolete', () => {
    expect(needsHistoricalBootstrap(fileWithVersion(1), 'full||1')).toBe(true);
    expect(needsHistoricalBootstrap(fileWithVersion(HISTORICAL_BOOTSTRAP_VERSION), 'full||1')).toBe(
      false,
    );
  });
});
