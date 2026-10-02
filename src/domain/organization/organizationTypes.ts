import type { MetricCardData } from "../performance";
import type { DeliveryRiskItem } from "../radar/types";
import type { AuthorizedPeopleScope } from "./authorizedPeopleScope";

export type OrganizationSignalKind =
  | "cycle_time_deterioration"
  | "rework_increase"
  | "delivery_risk_concentration"
  | "review_bottleneck"
  | "workload_concentration"
  | "leave_capacity"
  | "feedback_pending"
  | "new_starter_capacity";

export type OrganizationSignalSeverity = "info" | "warning" | "danger";

export type OrganizationSignalTarget =
  | { kind: "director-delivery"; teamId?: string; filter?: "review" | "all" }
  | { kind: "director-teams"; teamId: string }
  | { kind: "director-new-starters"; teamId?: string }
  | { kind: "performance"; view: "delivery-risk" | "radar" | "people" | "overview" }
  | { kind: "feedback"; tab: "delivery" | "survey" };

export interface OrganizationSignal {
  id: string;
  teamId?: string;
  teamName?: string;
  kind: OrganizationSignalKind;
  severity: OrganizationSignalSeverity;
  title: string;
  description: string;
  metricContext?: string;
  target: OrganizationSignalTarget;
}

export interface OrganizationTeamRow {
  teamId: string;
  teamName: string;
  peopleCount: number;
  activeWork: number;
  attentionCount: number;
  completed: number;
  firstPassPercent: number;
  avgCycleLabel: string;
  upcomingLeave: number;
  attentionSeverity: number;
}

export interface OrganizationTeamTrend {
  teamId: string;
  teamName: string;
  label: string;
  movement?: string;
  insufficientHistory?: boolean;
}

export interface OrganizationTeamCapacityRow {
  teamId: string;
  teamName: string;
  peopleTotal: number;
  awayNextWeek: number;
  label: string;
}

export interface OrganizationOverviewModel {
  scope: AuthorizedPeopleScope;
  scopeLabel: string;
  summary: MetricCardData[];
  teamTrends: OrganizationTeamTrend[];
  teamsNeedingAttention: OrganizationTeamRow[];
  signals: OrganizationSignal[];
  teams: OrganizationTeamRow[];
  deliveryRisk: DeliveryRiskItem[];
  teamCapacity: OrganizationTeamCapacityRow[];
  newStarterSummary: { total: number; byTeam: { teamId: string; teamName: string; count: number }[] };
  feedbackSummary: {
    pendingRecipients: number;
    deliveryFailures: number;
    preparedNotSent: boolean;
  };
}
