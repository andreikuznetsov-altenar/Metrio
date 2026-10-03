import type { RadarSeverity } from "../radar/types";

export type DependencyType =
  | "blocks"
  | "blocked_by"
  | "parent_child"
  | "explicit_dependency"
  | "related";

export type DependencyDirection = "outward" | "inward";

export interface WorkDependency {
  id: string;
  sourceIssueKey: string;
  targetIssueKey: string;
  type: DependencyType;
  direction: DependencyDirection;
  sourceProject: string;
  targetProject: string;
  sourcePersonId?: string;
  sourcePersonName?: string;
  targetPersonId?: string;
  targetPersonName?: string;
  sourceStatus: string;
  targetStatus: string;
  sourceSummary: string;
  targetSummary: string;
  sourceDueDate?: string;
  targetDueDate?: string;
  jiraLinkTypeName: string;
  /** True when this edge represents an active delivery block */
  isActiveBlock: boolean;
  crossProject: boolean;
  crossTeam: boolean;
}

export interface DependencyFanOut {
  blockerIssueKey: string;
  blockerSummary: string;
  blockerProject: string;
  blockedActiveCount: number;
  blockedIssueKeys: string[];
}

export interface DependencyChainLink {
  issueKey: string;
  summary: string;
  status: string;
  projectKey: string;
  blockedByKey?: string;
}

export interface DeliveryDependencyIndex {
  builtAt: string;
  dependencies: WorkDependency[];
  /** Blocked issue → blocking dependencies (active) */
  activeBlockersByIssue: Record<string, WorkDependency[]>;
  fanOut: DependencyFanOut[];
  summary: {
    blockedActiveCount: number;
    crossProjectCount: number;
    overdueDependencyCount: number;
  };
}

export interface ProjectDependencyRow {
  dependency: WorkDependency;
  perspective: "incoming" | "outgoing" | "blocked";
  chain?: DependencyChainLink[];
}

export interface ProjectDependencySection {
  incoming: ProjectDependencyRow[];
  outgoing: ProjectDependencyRow[];
  blocked: ProjectDependencyRow[];
  summaryLine: string;
}

export interface DependencyDrawerModel {
  blockedIssueKey: string;
  blockedSummary: string;
  blockedStatus: string;
  blockedProject: string;
  blocker: WorkDependency;
  ownerLabel?: string;
  ownerAwayLabel?: string;
  dueDateNote?: string;
  knowledgePages: { title: string; url: string }[];
  chain: DependencyChainLink[];
}

export interface HomeDependencySignal {
  id: string;
  title: string;
  description: string;
  severity: RadarSeverity;
  blockerKey?: string;
  filterIssueKeys?: string[];
}
