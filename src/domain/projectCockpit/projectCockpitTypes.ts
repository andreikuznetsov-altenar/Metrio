import type { MetricCardData } from "../performance";
import type { KnowledgePage } from "../workGraph/workGraphTypes";
import type { ProjectDependencySection } from "../dependencies/dependencyTypes";

export type ProjectCockpitScope =
  | { kind: "project"; projectKey: string }
  | { kind: "epic"; epicKey: string; projectKey?: string };

export type ProjectWorkFilter =
  | "all"
  | "attention"
  | "in_progress"
  | "in_review"
  | "completed";

export interface WorkProjectSummary {
  projectKey: string;
  projectName: string;
  jiraUrl: string;
  linkedSpaceKey?: string;
  activeCount: number;
  completedInPeriod: number;
}

export interface WorkInitiativeSummary {
  epicKey: string;
  summary: string;
  projectKey?: string;
}

export interface ProjectDeliverySignal {
  id: string;
  label: string;
  count: number;
  issueKeys: string[];
}

export interface ProjectWorkRow {
  issueKey: string;
  title: string;
  status: string;
  ownerName: string;
  personId?: string;
  canOpenPerson: boolean;
  stageAge: string;
  attentionLabel?: string;
  isCompleted: boolean;
}

export interface ProjectPersonContext {
  personId?: string;
  displayName: string;
  canOpenPerson: boolean;
  activeCount: number;
  inReviewCount: number;
  availabilityNote?: string;
}

export interface ProjectKnowledgeGroup {
  id: string;
  label: string;
  pages: KnowledgePage[];
}

export interface ProjectKnowledgeContext {
  groups: ProjectKnowledgeGroup[];
  previewPages: KnowledgePage[];
  totalCount: number;
  spaceUrl?: string;
  unavailable: boolean;
}

export interface ProjectCockpitModel {
  scope: ProjectCockpitScope;
  identity: WorkProjectSummary;
  initiative?: WorkInitiativeSummary;
  periodLabel: string;
  summary: {
    active: number;
    inReview: number;
    completedInPeriod: number;
    problematic: number;
  };
  deliveryFlow: {
    inProgress: number;
    inReview: number;
    problematic: number;
    noActivity: number;
    backflow: number;
  };
  deliverySignals: ProjectDeliverySignal[];
  kpis: MetricCardData[];
  workRows: ProjectWorkRow[];
  people: ProjectPersonContext[];
  distribution: {
    totalActive: number;
    contributorCount: number;
    maxActiveOwnedByOne: number;
  };
  capacityNote?: string;
  knowledge: ProjectKnowledgeContext;
  dependencies: ProjectDependencySection;
}
