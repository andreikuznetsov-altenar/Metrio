// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { navigatePerformanceView } from "./actionNavigation";
import {
  appNavigate,
  getAppNavigationState,
  resetAppNavigationStateForTests,
} from "./navigationStore";
import { writePersistedTeamPerformanceView } from "./performanceViewPersistence";

afterEach(() => {
  resetAppNavigationStateForTests();
  sessionStorage.clear();
});

describe("canonical navigation store", () => {
  it("applies route and Performance view in one synchronous update", () => {
    writePersistedTeamPerformanceView("radar");
    resetAppNavigationStateForTests({ route: "home", performanceView: "radar" });

    navigatePerformanceView("overview");

    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "overview",
    });
  });

  it("does not treat sessionStorage as the live navigation source", async () => {
    writePersistedTeamPerformanceView("radar");
    resetAppNavigationStateForTests({ route: "home", performanceView: "radar" });
    appNavigate({ route: "performance", performanceView: "overview" });
    expect(getAppNavigationState().performanceView).toBe("overview");
    expect(sessionStorage.getItem("metrio.performance.teamView.v1")).toBe("radar");
    await new Promise((resolve) => queueMicrotask(resolve));
    expect(sessionStorage.getItem("metrio.performance.teamView.v1")).toBe("overview");
  });

  it("keeps direct tab selection synchronous and off startTransition", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/performance/TeamPerformanceOverview.tsx"),
      "utf8",
    );
    expect(source).not.toContain("startTransition");
    expect(source).not.toContain("useKeepMountedView(");
    expect(source).not.toContain("metrio-open-performance-tab");
    expect(source).toContain("appNavigate({ performanceView: view })");
  });

  it("mounts only the active route layer", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/AppLayout.tsx"),
      "utf8",
    );
    expect(source).toContain('paintedRoute === "home"');
    expect(source).toContain('paintedRoute === "performance"');
    expect(source).toContain("getAppNavigationState().route");
    expect(source).not.toContain("hidden={activeRoute");
    expect(source).not.toContain("registerAppNavigation");
    expect(source).not.toContain("registerTeamPerformanceViewHandler");
  });
});
