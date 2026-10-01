import { describe, expect, it } from 'vitest';
import { getTeamTrendHistoryState } from './teamTrendHistory';
import type { KpiSnapshotFile } from '../snapshots/types';
import { HISTORICAL_BOOTSTRAP_VERSION } from '../history/constants';

function snapshotFile(version: number): KpiSnapshotFile {
  return {
    schemaVersion: 3,
    personSnapshots: [],
    teamSnapshots: [
      {
        date: '2026-02-01',
        source: 'historical_jira',
        atRiskTaskCount: null,
        problematicTaskCount: null,
        overloadedPeople: null,
        completedOnDate: 1,
        backflowsOnDate: 0,
        firstPassOnDate: 1,
        cycleMsSumOnDate: 0,
        completedWithCycleOnDate: 0,
      },
    ],
    historicalCoverage: {
      scopeKey: 'full||1',
      coverageStart: '2026-02-01',
      coverageEnd: '2026-02-01',
      bootstrapAt: '2026-03-04T00:00:00.000Z',
      bootstrapVersion: version,
      bootstrapStatus: 'complete',
      personCount: 1,
      projectCount: 0,
      scopeType: 'full',
    },
  };
}

describe('getTeamTrendHistoryState', () => {
  it('blocks trends while bootstrap is running', () => {
    const state = getTeamTrendHistoryState(snapshotFile(HISTORICAL_BOOTSTRAP_VERSION), {
      bootstrapInProgress: true,
    });
    expect(state.canShowTrends).toBe(false);
    expect(state.message).toBe('Updating history…');
  });

  it('blocks trends for obsolete bootstrap version', () => {
    const state = getTeamTrendHistoryState(snapshotFile(1));
    expect(state.canShowTrends).toBe(false);
    expect(state.message).toBe('Updating history…');
  });

  it('allows trends when history is complete at current version', () => {
    const state = getTeamTrendHistoryState(snapshotFile(HISTORICAL_BOOTSTRAP_VERSION));
    expect(state.canShowTrends).toBe(true);
  });
});
