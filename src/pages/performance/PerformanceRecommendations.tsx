import { DashboardRecommendations } from "../home/dashboard/DashboardRecommendations";
import { buildProductRecommendations } from "../../domain/recommendations/buildProductRecommendations";
import type { ProductRecommendation } from "../../domain/recommendations/buildProductRecommendations";
import { readVisualProductRecommendationsOverride } from "../../fixtures/productRecommendationsVisualFixture";
import type { ActionItem } from "../../domain/actions/actionTypes";
import type { WorkloadRow } from "../../domain/performance";

export function PerformanceRecommendations({
  deliverySummary,
  deliveryRiskCount,
  teamWorkload,
  teamActions,
  awayNextWeek,
  backflowIssueKeys,
  onAction,
}: {
  deliverySummary: {
    problematic: number;
    longReview: number;
    backflowSignals: number;
  };
  deliveryRiskCount: number;
  teamWorkload: WorkloadRow[];
  teamActions: ActionItem[];
  awayNextWeek?: number;
  backflowIssueKeys?: string[];
  onAction: (item: ProductRecommendation) => void;
}) {
  // Visual builds only (VITE_VISUAL_FIXTURE + localStorage): lets Playwright render the REAL carousel with enough cards.
  const items = readVisualProductRecommendationsOverride() ?? buildProductRecommendations({
    role: "manager",
    deliverySummary,
    deliveryRiskCount,
    teamWorkload,
    teamActions,
    focus: [],
    attentionItems: [],
    awayNextWeek,
    backflowIssueKeys,
    maxItems: 5,
  });

  return (
    <div className="performance-section" data-testid="performance-recommendations">
      <DashboardRecommendations
        items={items}
        onAction={onAction}
        surface="performance"
      />
    </div>
  );
}
