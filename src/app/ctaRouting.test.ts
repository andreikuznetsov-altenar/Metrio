import { describe, expect, it, vi } from "vitest";
import type { TeamPerformanceView } from "../domain/performance";
import {
  collectCtaRoutingEvents,
  navigateOpenDeliveryRisk,
  navigateOpenGoals,
  navigateOpenTeamBrief,
  navigateOpenTeamOverview,
} from "./ctaRouting";

function captureDeferredTabNavigation(action: () => void): {
  routes: string[];
  tabs: TeamPerformanceView[];
} {
  const routes: string[] = [];
  const tabs: TeamPerformanceView[] = [];
  const onRoute = (event: Event) => {
    routes.push((event as CustomEvent<string>).detail);
  };
  const onTab = (event: Event) => {
    tabs.push((event as CustomEvent<TeamPerformanceView>).detail);
  };
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
}

describe("CTA routing contract", () => {
  it("Open goals (team) routes to Performance goals tab", () => {
    const { routes, tabs } = captureDeferredTabNavigation(() =>
      navigateOpenGoals({ teamView: true }),
    );
    expect(routes).toEqual(["performance"]);
    expect(tabs).toEqual(["goals"]);
  });

  it("Open goals (employee) routes to employee goals view", () => {
    const events = collectCtaRoutingEvents(() => navigateOpenGoals({ teamView: false }));
    expect(events[0]).toEqual({ type: "metrio-navigate-route", route: "performance" });
    expect(events).toContainEqual({
      type: "metrio-open-employee-view",
      view: "goals",
    });
  });

  it("Open Delivery Risk routes to delivery-risk tab", () => {
    const { routes, tabs } = captureDeferredTabNavigation(() => navigateOpenDeliveryRisk());
    expect(routes).toEqual(["performance"]);
    expect(tabs).toEqual(["delivery-risk"]);
  });

  it("Open team overview routes to overview tab", () => {
    const { routes, tabs } = captureDeferredTabNavigation(() => navigateOpenTeamOverview());
    expect(routes).toEqual(["performance"]);
    expect(tabs).toEqual(["overview"]);
  });

  it("Open team brief routes to person brief drawer", () => {
    const events = collectCtaRoutingEvents(() => navigateOpenTeamBrief("person-01"));
    expect(events).toContainEqual({
      type: "metrio-open-person-brief",
      personId: "person-01",
    });
  });
});
