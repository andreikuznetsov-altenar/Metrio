export const KPI_SNAPSHOT_SCHEMA_VERSION = 4;

export type SnapshotSource = 'live_daily' | 'historical_jira';

/** Daily flow events + optional current-state fields for one person on a local calendar day. */
export interface DailyPersonSnapshot {
  date: string;
  personId: string;
  source: SnapshotSource;
  /** null = unknown (historical bootstrap); 0 = known zero */
  activeCount: number | null;
  workloadLevel: string | null;
  atRiskCount: number | null;
  problematicCount: number | null;
  completedOnDate: number;
  backflowsOnDate: number;
  firstPassOnDate: number;
  cycleMsSumOnDate: number;
  completedWithCycleOnDate: number;
}

export interface DailyTeamSnapshot {
  date: string;
  source: SnapshotSource;
  atRiskTaskCount: number | null;
  problematicTaskCount: number | null;
  overloadedPeople: number | null;
  completedOnDate: number;
  backflowsOnDate: number;
  firstPassOnDate: number;
  cycleMsSumOnDate: number;
  completedWithCycleOnDate: number;
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
