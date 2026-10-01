import { HISTORICAL_BOOTSTRAP_VERSION } from '../history/constants';
import { getHistoryCoverageSummary } from '../../services/history/historicalBootstrap';
import type { KpiSnapshotFile } from '../snapshots/types';

export interface TeamTrendHistoryState {
  canShowTrends: boolean;
  message: string;
}

export function getTeamTrendHistoryState(
  snapshots: KpiSnapshotFile,
  options?: {
    bootstrapInProgress?: boolean;
    bootstrapError?: string | null;
  },
): TeamTrendHistoryState {
  if (options?.bootstrapInProgress) {
    return { canShowTrends: false, message: 'Updating history…' };
  }
  if (options?.bootstrapError) {
    return { canShowTrends: false, message: 'Historical comparison unavailable' };
  }

  const coverage = snapshots.historicalCoverage;
  if (!coverage) {
    return { canShowTrends: false, message: 'Historical comparison unavailable' };
  }
  if (coverage.bootstrapStatus === 'failed') {
    return { canShowTrends: false, message: 'Historical comparison unavailable' };
  }
  if ((coverage.bootstrapVersion ?? 0) < HISTORICAL_BOOTSTRAP_VERSION) {
    return { canShowTrends: false, message: 'Updating history…' };
  }
  if (coverage.bootstrapStatus !== 'complete') {
    return { canShowTrends: false, message: 'Updating history…' };
  }

  const summary = getHistoryCoverageSummary(snapshots);
  if (summary?.partial) {
    return { canShowTrends: false, message: 'Historical comparison unavailable' };
  }

  const hasHistorical = snapshots.teamSnapshots.some((s) => s.source === 'historical_jira');
  if (!hasHistorical) {
    return { canShowTrends: false, message: 'Historical comparison unavailable' };
  }

  return { canShowTrends: true, message: '' };
}
