import type { BadgeVariant } from "../components/Badge/Badge";
import type { RadarSeverity } from "./radar/types";
import type { TrendDirection } from "./trends/trendEngine";

export type DateRangeKey = "7d" | "30d" | "3m" | "6m" | "1y";
export type ReviewTargetKey = "team" | "sprint" | "org";
export type EmployeeReviewTargetKey = "personal" | "sprint" | "quarter";

export type PerformanceReviewTarget = ReviewTargetKey | EmployeeReviewTargetKey;

export type MetricContextSemantic = "positive" | "negative" | "neutral" | "unknown";

export interface MetricCardData {
  label: string;
  value: string;
  status?: string;
  statusVariant?: BadgeVariant;
  tooltip?: string;
  contextLabel?: string;
  contextSemantic?: MetricContextSemantic;
  contextCaption?: string;
  cycleSegments?: { label: string; value: string }[];
}

export interface AttentionPerson {
  personId: string;
  personName?: string;
  personRole?: string;
  reason: string;
  severity: RadarSeverity;
  issueKeys: string[];
  issueCount: number;
  workload?: WorkloadRow["workload"];
}

export interface TrendCardData {
  label: string;
  value: string;
  sparkline?: number[];
  chartSeries?: { date: string; value: number }[];
  insufficientHistory?: boolean;
  historyRecordedDays?: number;
  historyRecommendedDays?: number;
  trendMetricKind?: "count" | "percent" | "duration";
  /** Numeric movement (arrow), not favorable direction. */
  trendMovementDirection?: TrendDirection;
  trendSemantic?: MetricContextSemantic;
}

export interface WorkloadRow {
  personId: string;
  personName?: string;
  activeWork: number;
  atRisk: number;
  workload: "Light" | "Balanced" | "Heavy" | "Overloaded";
  availability: string;
}

export interface TimeOffEntry {
  personId: string;
  personName?: string;
  rangeLabel: string;
  note: string;
  /** ISO date (yyyy-MM-dd) when leave starts — for action rules only. */
  startDate?: string;
  endDate?: string;
}

export interface PersonPerformanceDetail {
  personId: string;
  efficiency: string;
  firstPass: string;
  completed: string;
  workload: string;
  summary: string;
}

export interface PersonDetailSnapshot {
  personId: string;
  personName?: string;
  availability: string;
  workload: string;
  efficiency: string;
  firstPass: string;
  completed: string;
  backflows: string;
  attention: PersonalAttentionItem[];
  activeWork: ActiveWorkItem[];
  history: WorkHistoryRow[];
  problematicWork: ActiveWorkItem[];
}

export interface TeamPerformanceSnapshot {
  directReportIds: string[];
  summary: MetricCardData[];
  attention: AttentionPerson[];
  attentionTotalCount: number;
  trends: TrendCardData[];
  workload: WorkloadRow[];
  timeOff: TimeOffEntry[];
  personDetails: Record<string, PersonPerformanceDetail>;
}

export interface ActiveWorkItem {
  key: string;
  title: string;
  status: string;
}

export interface EmployeeWorkRowView {
  key: string;
  title: string;
  status: string;
  stageAge: string;
  healthVariant: BadgeVariant;
}

export interface EmployeeCompletedRowView {
  key: string;
  title: string;
  completedOn?: string;
  cycle?: string;
  outcome?: string;
}

export interface PersonalAttentionItem {
  label: string;
  variant: BadgeVariant;
  reason: string;
  issueKey?: string;
}

export interface WorkHistoryRow {
  key: string;
  title: string;
  project: string;
  completedOn: string;
  cycle: string;
  outcome: string;
  completedAtIso?: string;
  cycleMs?: number | null;
  firstPass?: boolean | null;
}

export type EmployeePerformanceView =
  | "overview"
  | "my-week"
  | "trends"
  | "work-history";

export interface MyWeekMetricCard {
  label: string;
  value: string;
}

export interface EmployeeMyWeekSnapshot {
  summary: MyWeekMetricCard[];
  needsAttention: PersonalAttentionItem[];
  inProgress: EmployeeWorkRowView[];
  inReview: EmployeeWorkRowView[];
  completedThisWeek: EmployeeCompletedRowView[];
}

export interface WorkHistoryGroupView {
  label: string;
  completedCount: number;
  firstPassCount: number;
  reviewReturns: number;
  rows: WorkHistoryRow[];
}

export interface EmployeePerformanceSnapshot {
  personId: string;
  metrics: MetricCardData[];
  cycleTime: { label: string; value: string }[];
  activeWork: ActiveWorkItem[];
  attention: PersonalAttentionItem[];
  timeOff?: {
    rangeLabel: string;
    note: string;
    startDate?: string;
    endDate?: string;
    headline?: string;
  };
  trends: TrendCardData[];
  myWeek: EmployeeMyWeekSnapshot;
  historyWeek: WorkHistoryGroupView[];
  historyMonth: WorkHistoryGroupView[];
  historyQuarter: WorkHistoryGroupView[];
}

export function isManagerRole(role: string): boolean {
  return role === "lead" || role === "director";
}

export function isDirectorRole(role: string): boolean {
  return role === "director";
}

export type DirectorPerformanceView =
  | "overview"
  | "teams"
  | "signals"
  | "delivery";

export type TeamPerformanceView =
  | "overview"
  | "people"
  | "radar"
  | "delivery-risk";

export interface TeamPeopleRow {
  personId: string;
  personName: string;
  role: string;
  efficiency: string;
  workload: string;
  availability: string;
  /** @deprecated use attentionSeverityLabel + attentionIssueKey + attentionReason */
  attentionState: string;
  attentionVariant: BadgeVariant;
  attentionSeverityLabel: string;
  attentionIssueKey?: string;
  attentionReason: string;
}

export interface TeamRadarRow {
  personId: string;
  personName: string;
  severity: "High" | "Medium" | "Low";
  severityVariant: BadgeVariant;
  reason: string;
  tasksAffected: number;
  action: string;
}

export interface DeliveryRiskRow {
  issueKey: string;
  issueTitle: string;
  ownerId: string;
  ownerName?: string;
  age: string;
  status: string;
  riskReason: string;
}

export interface TeamSecondarySnapshot {
  people: TeamPeopleRow[];
  radar: TeamRadarRow[];
  deliveryRisk: DeliveryRiskRow[];
}
