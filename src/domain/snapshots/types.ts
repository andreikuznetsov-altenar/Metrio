import type { DailyFlowFields } from '../history/dailyFlowFields';

/**
 * V7 (Organization & Signals Methodology V2).
 *   V6: canonical cycle methodology (event backflows, owner attribution, business-window durations).
 *   V7: flow rows also carry `reworkedCyclesOnDate` and raw cycle/execution duration samples, so
 *       Rework Rate and Cycle/Execution Time aggregate from primitives; sampled state counts
 *       (at-risk / problematic / overloaded) use Task Health V2 and strict "Overloaded".
 * Older derived snapshots are invalidated, never mixed into the new series.
 */
export const KPI_SNAPSHOT_SCHEMA_VERSION = 7;

/**
 * Methodology stamp written into every snapshot file. A file with a different stamp is
 * invalidated on load (see `migrateKpiSnapshotFile`) — derived rows from different methodologies
 * must never be compared inside one trend.
 */
export const KPI_SNAPSHOT_METHODOLOGY = 'metrics-v2+capacity-v2+signals-v2';

export type SnapshotSource = 'live_daily' | 'historical_jira';

/** Daily flow events + optional current-state fields for one person on a local calendar day. */
export interface DailyPersonSnapshot extends DailyFlowFields {
  date: string;
  personId: string;
  source: SnapshotSource;
  /** State metrics (sampled once per recorded day). null = unknown (historical bootstrap); 0 = known zero */
  activeCount: number | null;
  workloadLevel: string | null;
  atRiskCount: number | null;
  problematicCount: number | null;
}

export interface DailyTeamSnapshot extends DailyFlowFields {
  date: string;
  source: SnapshotSource;
  /** State metrics (sampled once per recorded day), null = unknown. */
  atRiskTaskCount: number | null;
  problematicTaskCount: number | null;
  /** People whose Current workload level is strictly Overloaded (> 100%). */
  overloadedPeople: number | null;
}

export type HistoricalBootstrapStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'partial'
  | 'failed';

export interface HistoricalCoverage {
  scopeKey: string;
  coverageStart: string | null;
  coverageEnd: string | null;
  bootstrapAt: string | null;
  bootstrapVersion: number;
  bootstrapStatus: HistoricalBootstrapStatus;
  personCount: number;
  projectCount: number;
  scopeType: 'full' | 'direct';
}

export interface KpiSnapshotFile {
  schemaVersion: number;
  /** Methodology stamp — see KPI_SNAPSHOT_METHODOLOGY. */
  methodology?: string;
  personSnapshots: DailyPersonSnapshot[];
  teamSnapshots: DailyTeamSnapshot[];
  historicalCoverage?: HistoricalCoverage;
}

/** Legacy v1 shape — report-period cumulative metrics, not daily events. */
export interface LegacyDailyPersonSnapshot {
  date: string;
  personId: string;
  activeCount: number;
  completedCount?: number;
  firstPassPercent?: number;
  avgCycleMs?: number | null;
  backflowCount?: number;
  workloadLevel: string;
  atRiskCount: number;
  problematicCount: number;
}
