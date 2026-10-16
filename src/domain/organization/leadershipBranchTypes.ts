import type { DeliveryRiskItem } from "../radar/types";

export interface BranchCapacitySummary {
  totalPeople: number;
  measuredPeople: number;
  /** People whose Current workload cannot be rated (no workload data, or away for the horizon). */
  unratedPeople: number;
  light: number;
  balanced: number;
  heavy: number;
  overloaded: number;
}

export interface LeadershipBranchMetrics {
  activeWorkCount: number;
  uniqueDeliveryRiskCount: number;
  longReviewCount: number;
  problematicCount: number;
  attentionCritical: number;
  attentionWatch: number;
  firstPassPercent: number;
  completedCount: number;
  backflowEventCount: number;
  reworkedCycleCount: number;
  throughputCount: number;
  capacity: BranchCapacitySummary;
  /** Current workload of the branch: Σ expected effort / Σ available hours (10 working days). */
  currentWorkload: {
    expectedEffortHours: number;
    availableHoursInHorizon: number;
    percent: number | null;
    label: string;
  };
  /** Historical load of the branch: Σ merged hands-on hours / Σ scheduled available hours. */
  historicalLoad: {
    executionHoursInPeriod: number;
    availableHoursInPeriod: number;
    percent: number | null;
  };
  awayNow: number;
  awaySoon: number;
}

export interface LeadershipBranch {
  leaderId: string;
  leaderName: string;
  leaderTitle?: string;
  memberIds: string[];
  descendantIds: string[];
  directReportCount: number;
  totalPeopleCount: number;
  metrics: LeadershipBranchMetrics;
}

export interface LeadershipBranchAggregationInput {
  branches: Array<{ managerId: string; descendantIds: string[] }>;
  roster: Array<{ id: string; displayName: string; jobTitle?: string }>;
  persons: import("../people/types").Person[];
  deliveryRisk: DeliveryRiskItem[];
  deliverySummaryByPerson?: Map<string, { longReview?: number; problematic?: number }>;
}
