// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";
import { navigateProductRecommendation } from "./productRecommendationNavigation";
import { getAppNavigationState, resetAppNavigationStateForTests } from "./navigationStore";

afterEach(() => {
  resetAppNavigationStateForTests();
});

function recommendation(
  actionKind: ProductRecommendation["actionKind"],
  extra: Partial<ProductRecommendation> = {},
): ProductRecommendation {
  return {
    id: actionKind,
    severity: "watch",
    title: actionKind,
    explanation: actionKind,
    actionLabel: actionKind,
    actionKind,
    priority: 1,
    ...extra,
  };
}

describe("product recommendation interaction matrix", () => {
  it("routes View person to the canonical person handler", () => {
    const openPerson = vi.fn();
    navigateProductRecommendation(
      recommendation("view_person", { personId: "person-01" }),
      { openPerson, openJira: vi.fn() },
    );
    expect(openPerson).toHaveBeenCalledWith("person-01");
  });

  it("routes Open Performance to Performance Overview", () => {
    navigateProductRecommendation(recommendation("open_performance"), {
      openPerson: vi.fn(),
      openJira: vi.fn(),
    });
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "overview",
    });
  });

  it("routes Open Delivery Risk to the delivery-risk view", () => {
    navigateProductRecommendation(recommendation("open_delivery_risk"), {
      openPerson: vi.fn(),
      openJira: vi.fn(),
    });
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "delivery-risk",
    });
  });

  it("routes Open Jira to the configured Jira handler", () => {
    const openJira = vi.fn();
    navigateProductRecommendation(
      recommendation("open_jira", { issueKey: "AGTC-105" }),
      { openPerson: vi.fn(), openJira },
    );
    expect(openJira).toHaveBeenCalledWith("AGTC-105");
  });
});
