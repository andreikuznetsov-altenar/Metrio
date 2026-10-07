// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";
import { navigateProductRecommendation } from "./productRecommendationNavigation";

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
  const capturePerformanceRoute = (action: () => void) => {
    const routes: string[] = [];
    const tabs: string[] = [];
    const onRoute = (event: Event) =>
      routes.push((event as CustomEvent<string>).detail);
    const onTab = (event: Event) =>
      tabs.push((event as CustomEvent<string>).detail);
    window.addEventListener("metrio-navigate-route", onRoute);
    window.addEventListener("metrio-open-performance-tab", onTab);
    vi.useFakeTimers();
    try {
      action();
      vi.runAllTimers();
    } finally {
      window.removeEventListener("metrio-navigate-route", onRoute);
      window.removeEventListener("metrio-open-performance-tab", onTab);
      vi.useRealTimers();
    }
    return { routes, tabs };
  };

  it("routes View person to the canonical person handler", () => {
    const openPerson = vi.fn();
    navigateProductRecommendation(
      recommendation("view_person", { personId: "person-01" }),
      { openPerson, openJira: vi.fn() },
    );
    expect(openPerson).toHaveBeenCalledWith("person-01");
  });

  it("routes Open Performance to Performance Overview", () => {
    const events = capturePerformanceRoute(() =>
      navigateProductRecommendation(recommendation("open_performance"), {
        openPerson: vi.fn(),
        openJira: vi.fn(),
      }),
    );
    expect(events.routes).toEqual(["performance"]);
    expect(events.tabs).toEqual(["overview"]);
  });

  it("routes Open Delivery Risk to the delivery-risk view", () => {
    const events = capturePerformanceRoute(() =>
      navigateProductRecommendation(recommendation("open_delivery_risk"), {
        openPerson: vi.fn(),
        openJira: vi.fn(),
      }),
    );
    expect(events.routes).toEqual(["performance"]);
    expect(events.tabs).toEqual(["delivery-risk"]);
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
