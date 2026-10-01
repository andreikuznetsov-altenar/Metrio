import type { BadgeVariant } from "../components/Badge/Badge";

export type DateRangeKey = "7d" | "30d" | "quarter";
export type ReviewTargetKey = "team" | "sprint" | "org";
export type EmployeeReviewTargetKey = "personal" | "sprint" | "quarter";

export type PerformanceReviewTarget = ReviewTargetKey | EmployeeReviewTargetKey;

export interface MetricCardData {
  label: string;
  value: string;
  status?: string;
  statusVariant?: BadgeVariant;
  tooltip?: string;
}

export interface AttentionPerson {
  personId: string;
  indicators: { label: string; variant: BadgeVariant }[];
  reason: string;
}

export interface TrendCardData {
  label: string;
  value: string;
  sparkline?: number[];
}

export interface WorkloadRow {
  personId: string;
  activeWork: number;
  atRisk: number;
  workload: "Light" | "Balanced" | "Heavy";
  availability: string;
}

export interface TimeOffEntry {
  personId: string;
  rangeLabel: string;
  note: string;
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
  availability: string;
  workload: string;
  efficiency: string;
  firstPass: string;
  completed: string;
  backflows: string;
  attention: PersonalAttentionItem[];
  activeWork: ActiveWorkItem[];
  history: WorkHistoryRow[];
}

export interface TeamPerformanceSnapshot {
  directReportIds: string[];
  summary: MetricCardData[];
  attention: AttentionPerson[];
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

export interface PersonalAttentionItem {
  label: string;
  variant: BadgeVariant;
  reason: string;
}

export interface WorkHistoryRow {
  key: string;
  title: string;
  completedOn: string;
  cycle: string;
  outcome: string;
}

export interface EmployeePerformanceSnapshot {
  personId: string;
  metrics: MetricCardData[];
  activeWork: ActiveWorkItem[];
  attention: PersonalAttentionItem[];
  timeOff?: { rangeLabel: string; note: string };
  trends: TrendCardData[];
  history: WorkHistoryRow[];
}

export function isManagerRole(role: string): boolean {
  return role === "lead" || role === "director";
}

export type TeamPerformanceView =
  | "overview"
  | "people"
  | "radar"
  | "delivery-risk";

export interface TeamPeopleRow {
  personId: string;
  efficiency: string;
  workload: string;
  availability: string;
  attentionState: string;
  attentionVariant: BadgeVariant;
}

export interface TeamRadarRow {
  personId: string;
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
  age: string;
  status: string;
  riskReason: string;
}

export interface TeamSecondarySnapshot {
  people: TeamPeopleRow[];
  radar: TeamRadarRow[];
  deliveryRisk: DeliveryRiskRow[];
}
