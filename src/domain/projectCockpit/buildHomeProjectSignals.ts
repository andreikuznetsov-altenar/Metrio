import type { HomeProjectSignal } from "../home/homeTypes";
import type { DeliveryRiskRow } from "../performance";
import type { OperationalRules } from "../operationalRules/operationalRulesTypes";
import { DEFAULT_OPERATIONAL_RULES } from "../operationalRules/operationalRulesDefaults";
import { projectKeyFromIssueKey } from "../workGraph/issueProjectKey";

function parseStageDays(age: string): number {
  const match = age.match(/(\d+)\s*day/i);
  return match ? Number(match[1]) : 0;
}

/** Meaningful per-project delivery signals for Home (not raw issue counts). */
export function buildHomeProjectSignals(
  deliveryRisk: DeliveryRiskRow[],
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): HomeProjectSignal[] {
  const longReviewDays = rules.taskAttention.longReviewHighlightDays;
  const longReviewByProject = new Map<string, number>();
  const reviewBottleneckByProject = new Map<string, number>();

  for (const row of deliveryRisk) {
    const projectKey = projectKeyFromIssueKey(row.issueKey);
    if (!projectKey) continue;
    const inReview = /review/i.test(row.status);
    const longReview = inReview && parseStageDays(row.age) >= longReviewDays;
    if (longReview) {
      longReviewByProject.set(
        projectKey,
        (longReviewByProject.get(projectKey) ?? 0) + 1,
      );
    }
    if (inReview && /review/i.test(row.riskReason)) {
      reviewBottleneckByProject.set(
        projectKey,
        (reviewBottleneckByProject.get(projectKey) ?? 0) + 1,
      );
    }
  }

  const signals: HomeProjectSignal[] = [];
  for (const [projectKey, count] of longReviewByProject) {
    if (count < 2) continue;
    signals.push({
      projectKey,
      label: `${count} tasks in long Review`,
    });
  }
  for (const [projectKey, count] of reviewBottleneckByProject) {
    if (count < 3) continue;
    if (signals.some((s) => s.projectKey === projectKey)) continue;
    signals.push({
      projectKey,
      label: `${count} tasks need Review attention`,
    });
  }

  return signals.sort((a, b) => a.projectKey.localeCompare(b.projectKey)).slice(0, 4);
}
