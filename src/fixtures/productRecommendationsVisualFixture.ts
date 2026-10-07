import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";

export const VISUAL_PRODUCT_RECOMMENDATIONS_STORAGE_KEY =
  "metrio-visual-product-recommendations";

export const VISUAL_OPEN_PERFORMANCE_RECOMMENDATION: ProductRecommendation[] = [
  {
    id: "visual-open-performance",
    severity: "watch",
    title: "Review recurring backflow",
    explanation:
      "Visual fixture: deterministic Open Performance recommendation for E2E.",
    actionLabel: "Open Performance",
    actionKind: "open_performance",
    priority: 1,
  },
];

export function readVisualProductRecommendationsOverride(): ProductRecommendation[] | null {
  if (import.meta.env.VITE_VISUAL_FIXTURE !== "1") return null;
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(VISUAL_PRODUCT_RECOMMENDATIONS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProductRecommendation[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeOpenPerformanceRecommendationForPlaywright(): string {
  return JSON.stringify(VISUAL_OPEN_PERFORMANCE_RECOMMENDATION);
}
