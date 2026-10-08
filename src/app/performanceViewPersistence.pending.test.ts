// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { appNavigate, getAppNavigationState, resetAppNavigationStateForTests } from "./navigationStore";
import { writePersistedTeamPerformanceView } from "./performanceViewPersistence";

afterEach(() => {
  resetAppNavigationStateForTests();
  sessionStorage.clear();
});

describe("Performance view persistence", () => {
  it("live navigation overrides a stale persisted Radar tab", () => {
    writePersistedTeamPerformanceView("radar");
    resetAppNavigationStateForTests({ route: "home", performanceView: "radar" });
    appNavigate({ route: "performance", performanceView: "overview" });
    expect(getAppNavigationState().performanceView).toBe("overview");
    expect(sessionStorage.getItem("metrio.performance.teamView.v1")).toBe("radar");
  });
});
