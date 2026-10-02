import type { KpiData, ReportParams } from "../jira/types";

export type AnalyticsDrilldownMetric =
  | "efficiency"
  | "first_pass"
  | "completed"
  | "backflows"
  | "avg_cycle";

export type AnalyticsCycleOutcome =
  | "first_pass"
  | "rework"
  | "backflow"
  | "completed";

export type AnalyticsEvidenceDetailLevel = "task" | "aggregate";

export interface AnalyticsBackflowEvent {
  changedAt: string;
  transitionLabel: string;
}

export interface AnalyticsEvidenceIssue {
  issueKey: string;
  title: string;
  personId?: string;
  personName?: string;
  projectKey?: string;
  status?: string;
  completedAt?: string;
  cycleDurationMs?: number | null;
  cycleIndex?: number;
  cycleLabel?: string;
  outcome?: AnalyticsCycleOutcome;
  backflowCount?: number;
  backflowEvents?: AnalyticsBackflowEvent[];
}

export interface AnalyticsEvidenceSummaryLine {
  label: string;
  value: string;
}

export interface AnalyticsEfficiencyComponent {
  id: string;
  label: string;
  valueLabel: string;
  detail?: string;
}

export interface AnalyticsEvidence {
  metric: AnalyticsDrilldownMetric;
  title: string;
  valueLabel: string;
  rangeLabel: string;
  targetLabel: string;
  comparisonLabel?: string;
  description: string;
  detailLevel: AnalyticsEvidenceDetailLevel;
  aggregateNote?: string;
  summaryLines: AnalyticsEvidenceSummaryLine[];
  efficiencyComponents?: AnalyticsEfficiencyComponent[];
  issues: AnalyticsEvidenceIssue[];
  totalCountable: number;
  params: ReportParams;
  kpi: KpiData;
  bucketDate?: string;
  personDisplayName?: string;
  personId?: string;
}

export interface IssueAttribution {
  personCanonical: string;
  personName: string;
}
