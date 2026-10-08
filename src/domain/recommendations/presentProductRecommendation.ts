import type {
  ProductRecommendation,
  RecommendationActionKind,
} from "./buildProductRecommendations";

export type RecommendationSurface = "dashboard" | "performance";

export interface PresentedProductRecommendation {
  actionLabel: string;
  actionKind: RecommendationActionKind;
}

/**
 * Resolve CTA label/kind for the surface where the recommendation is shown.
 * Dashboard keeps Open Performance → Overview. Performance must not keep a no-op
 * Open Performance when already on Overview.
 */
export function presentProductRecommendation(
  recommendation: ProductRecommendation,
  surface: RecommendationSurface,
): PresentedProductRecommendation {
  if (surface !== "performance" || recommendation.actionKind !== "open_performance") {
    return {
      actionLabel: recommendation.actionLabel,
      actionKind: recommendation.actionKind,
    };
  }

  const isBackflow =
    recommendation.id === "backflow-review" ||
    /backflow/i.test(recommendation.title);

  if (recommendation.issueKeys && recommendation.issueKeys.length > 0) {
    return {
      actionLabel: isBackflow ? "Review backflows" : "Review tasks",
      actionKind: "review_issues",
    };
  }

  return {
    actionLabel: isBackflow ? "Open History reports" : "Open History reports",
    actionKind: "open_history_reports",
  };
}
