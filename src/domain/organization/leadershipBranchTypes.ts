import type { DeliveryRiskItem } from "../radar/types";

export interface BranchCapacitySummary {
  totalPeople: number;
  measuredPeople: number;
  insufficientHistoryPeople: number;
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
  backflowCount: number;
  efficiencyIndex: number;
  capacity: BranchCapacitySummary;
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
