import type { ActionItem } from "../actions/actionTypes";
import type { JiraAssignmentRecord } from "../jira/jiraAssignmentTracking";
import type { MetricCardData } from "../performance";
import type { OrganizationOverviewModel } from "../organization/organizationTypes";
import type { ManagerAvailabilityRow } from "../availability/teamAvailabilityContext";

export type HomeRoleVariant = "employee" | "manager" | "director";

export interface HomePerformanceSnapshot {
  metrics: Pick<MetricCardData, "label" | "value">[];
}

export interface HomeNewStarterCard {
  headline: string;
  resourceCount: number;
  bambooActionCount: number;
}

export interface HomeTimeOffCard {
  headline: string;
  rangeLabel: string;
  activeCount: number;
  inReviewCount: number;
}

export interface HomeKnowledgeItem {
  id: string;
  title: string;
  url: string;
  relatedIssueKey?: string;
}

export interface HomeDeliverySummary {
  problematic: number;
  longReview: number;
  backflowSignals: number;
}

export interface HomeFeedbackCard {
  headline: string;
  detail?: string;
}

export interface HomeNewStarterTeamRow {
  personId: string;
  personName: string;
  dayLabel: string;
}

export interface HomePersonalWorkspace {
  focus: ActionItem[];
  newAssignments: JiraAssignmentRecord[];
  newStarter?: HomeNewStarterCard;
  timeOff?: HomeTimeOffCard;
  knowledge: HomeKnowledgeItem[];
  knowledgeStatus: "idle" | "loading" | "ready" | "unavailable";
  performanceSnapshot: HomePerformanceSnapshot;
}

export interface HomeTeamWorkspace {
  actions: ActionItem[];
  deliverySummary: HomeDeliverySummary;
  awayNextWeek: number;
  availabilityPreview: ManagerAvailabilityRow[];
  newStarters: HomeNewStarterTeamRow[];
  feedback: HomeFeedbackCard | null;
}

export interface HomeOrganizationWorkspace {
  model: OrganizationOverviewModel;
  signalCount: number;
  teamsNeedingAttention: number;
}

export interface HomeWorkspace {
  role: HomeRoleVariant;
  greeting: string;
  contextLine: string;
  personal: HomePersonalWorkspace;
  team?: HomeTeamWorkspace;
  organization?: HomeOrganizationWorkspace;
}
