import { describe, expect, it } from "vitest";
import {
  collectCtaRoutingEvents,
  navigateOpenDeliveryRisk,
  navigateOpenGoals,
  navigateOpenTeamBrief,
  navigateOpenTeamOverview,
} from "./ctaRouting";

describe("CTA routing contract", () => {
  it("Open goals (team) routes to Performance goals tab", () => {
    const events = collectCtaRoutingEvents(() => navigateOpenGoals({ teamView: true }));
    expect(events[0]).toEqual({ type: "metrio-navigate-route", route: "performance" });
    const tabEvents = events.filter((e) => e.type === "metrio-open-performance-tab");
    expect(tabEvents).toContainEqual({
      type: "metrio-open-performance-tab",
      tab: "goals",
    });
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
    const events = collectCtaRoutingEvents(() => navigateOpenDeliveryRisk());
    expect(events[0]).toEqual({ type: "metrio-navigate-route", route: "performance" });
    expect(events).toContainEqual({
      type: "metrio-open-performance-tab",
      tab: "delivery-risk",
    });
  });

  it("Open team overview routes to overview tab", () => {
    const events = collectCtaRoutingEvents(() => navigateOpenTeamOverview());
    expect(events).toContainEqual({
      type: "metrio-open-performance-tab",
      tab: "overview",
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
