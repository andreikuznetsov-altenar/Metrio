import { afterEach, describe, expect, it } from "vitest";
import {
  collectCtaRoutingEvents,
  navigateOpenDeliveryRisk,
  navigateOpenGoals,
  navigateOpenTeamBrief,
  navigateOpenTeamOverview,
} from "./ctaRouting";
import { getAppNavigationState, resetAppNavigationStateForTests } from "./navigationStore";

afterEach(() => {
  resetAppNavigationStateForTests();
});

describe("CTA routing contract", () => {
  it("Open goals (team) routes to Performance goals tab", () => {
    navigateOpenGoals({ teamView: true });
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "goals",
    });
  });

  it("Open goals (employee) routes to employee goals view", () => {
    const events = collectCtaRoutingEvents(() => navigateOpenGoals({ teamView: false }));
    expect(getAppNavigationState().route).toBe("performance");
    expect(events).toContainEqual({
      type: "metrio-open-employee-view",
      view: "goals",
    });
  });

  it("Open Delivery Risk routes to delivery-risk tab", () => {
    navigateOpenDeliveryRisk();
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "delivery-risk",
    });
  });

  it("Open team overview routes to overview tab", () => {
    navigateOpenTeamOverview();
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "overview",
    });
  });

  it("Open team brief routes to person brief drawer", () => {
    const events = collectCtaRoutingEvents(() => navigateOpenTeamBrief("person-01"));
    expect(events).toContainEqual({
      type: "metrio-open-person-brief",
      personId: "person-01",
    });
  });
});
