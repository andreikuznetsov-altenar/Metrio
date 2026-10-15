export type RecommendedActionType =
  | "stale_review"
  | "stale_hold"
  | "no_recent_goal"
  | "high_workload"
  | "upcoming_leave"
  | "team_capacity"
  | "delivery_risk_concentration";

/**
 * P1 immediate operational risk · P2 stale / blocked work · P3 workload, capacity, leave ·
 * P4 development / goal hygiene.
 */
export type RecommendedActionPriority = 1 | 2 | 3 | 4;

/** Where the CTA lands. Resolved to real navigation by the dashboard host, never by the engine. */
export type RecommendedActionDestination =
  | { kind: "issue_list"; issueKeys: string[]; title: string }
  | { kind: "delivery_risk" }
  | { kind: "person"; personId: string }
  | { kind: "team_workload" }
  | { kind: "goals" }
  | { kind: "my_work" };

export interface RecommendedAction {
  id: string;
  type: RecommendedActionType;
  priority: RecommendedActionPriority;
  title: string;
  description: string;
  actionLabel: string;
  destination: RecommendedActionDestination;
  affectedCount?: number;
  personId?: string;
  issueKeys?: string[];
  /** Tie-break inside a priority group: higher first (age in days, severity, count). */
  weight: number;
}
