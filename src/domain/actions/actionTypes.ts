export type ActionSeverity = "critical" | "warning" | "info";

export type ActionKind =
  | "task_attention"
  | "review_bottleneck"
  | "workload"
  | "upcoming_leave"
  | "leave_delivery_risk"
  | "feedback_pending"
  | "knowledge"
  | "knowledge_gap";

export type ActionTarget =
  | { kind: "person"; personId: string; tab?: "overview" | "work" | "history" }
  | { kind: "jira"; issueKey: string }
  | { kind: "delivery-risk" }
  | { kind: "performance"; view: "overview" | "people" | "radar" | "delivery-risk" }
  | { kind: "feedback"; tab: "survey" | "delivery" | "results" | "history" }
  | { kind: "confluence"; pageId: string; url: string }
  | { kind: "employee-work"; view: "my-week" | "overview" }
  | { kind: "home" };

export interface ActionItem {
  id: string;
  kind: ActionKind;
  severity: ActionSeverity;
  title: string;
  description?: string;
  personId?: string;
  personName?: string;
  issueKeys?: string[];
  count?: number;
  target: ActionTarget;
  source?: "jira" | "bamboo" | "confluence" | "feedback";
}

export interface RoleWorkspaceContext {
  employeeFocus: ActionItem[];
  teamActions: ActionItem[];
  organizationActions: ActionItem[];
}
