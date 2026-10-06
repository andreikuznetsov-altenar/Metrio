import type { LeadershipBranch } from "../organization/leadershipBranchTypes";
import type { ProductRecommendation } from "./buildProductRecommendations";

function branchPriority(branch: LeadershipBranch): number {
  const m = branch.metrics;
  if (m.attentionCritical > 0 || m.problematicCount > 0) return 1;
  if (m.longReviewCount >= 5) return 2;
  if (m.capacity.heavy + m.capacity.overloaded >= 2) return 3;
  if (m.awayNow + m.awaySoon >= 2) return 4;
  if (m.attentionWatch > 0) return 5;
  return 6;
}

export function buildLeadershipRecommendations(input: {
  branches: LeadershipBranch[];
  maxItems: number;
}): ProductRecommendation[] {
  const candidates: ProductRecommendation[] = [];

  for (const branch of input.branches) {
    const m = branch.metrics;
    const leader = branch.leaderName;

    if (m.uniqueDeliveryRiskCount >= 3 || m.longReviewCount >= 3) {
      candidates.push({
        id: `branch-delivery-${branch.leaderId}`,
        severity: m.problematicCount > 0 ? "critical" : "watch",
        title: `${leader} needs delivery attention`,
        explanation: `${m.uniqueDeliveryRiskCount} delivery-risk items across the branch${m.longReviewCount > 0 ? `, including ${m.longReviewCount} long-review` : ""}. Review priorities with ${leader}.`,
        actionLabel: "Open Delivery Risk",
        actionKind: "open_delivery_risk",
        priority: branchPriority(branch),
      });
      continue;
    }

    if (m.capacity.heavy + m.capacity.overloaded >= 1 && m.capacity.insufficientHistoryPeople >= 2) {
      candidates.push({
        id: `branch-capacity-${branch.leaderId}`,
        severity: "watch",
        title: `${leader} capacity is uneven`,
        explanation: `${m.capacity.heavy + m.capacity.overloaded} people are Heavy or Overloaded while ${m.capacity.insufficientHistoryPeople} do not yet have enough history. Review allocation with ${leader}.`,
        actionLabel: "Open Performance",
        actionKind: "open_performance",
        priority: branchPriority(branch),
      });
      continue;
    }

    if (m.awayNow + m.awaySoon >= 2) {
      candidates.push({
        id: `branch-availability-${branch.leaderId}`,
        severity: "watch",
        title: `${leader} coverage risk`,
        explanation: `${m.awayNow + m.awaySoon} people are away or leaving soon in this branch. Confirm coverage with ${leader}.`,
        actionLabel: "Open Performance",
        actionKind: "open_performance",
        priority: branchPriority(branch),
      });
    }
  }

  const seen = new Set<string>();
  const merged: ProductRecommendation[] = [];
  for (const rec of candidates.sort((a, b) => a.priority - b.priority)) {
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    merged.push(rec);
    if (merged.length >= input.maxItems) break;
  }
  return merged;
}
