// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { navigatePerformanceView } from "./actionNavigation";
import {
  getAppNavigationState,
  resetAppNavigationStateForTests,
} from "./navigationStore";

afterEach(() => {
  resetAppNavigationStateForTests();
});

describe("navigatePerformanceView", () => {
  it("sets Performance route and team view together", () => {
    resetAppNavigationStateForTests({ route: "home", performanceView: "radar" });
    navigatePerformanceView("delivery-risk");
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "delivery-risk",
    });
  });
});
