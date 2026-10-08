import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTeamPerformanceViewIfMounted,
  registerAppNavigation,
  registerTeamPerformanceViewHandler,
} from "./appNavigation";
import { navigatePerformanceView } from "./actionNavigation";

describe("appNavigation bridge", () => {
  afterEach(() => {
    registerAppNavigation(null);
    registerTeamPerformanceViewHandler(null);
  });

  it("navigatePerformanceView uses the bridge and mounted tab handler", () => {
    const openPerformanceRoute = vi.fn();
    const applyView = vi.fn();
    registerAppNavigation({ openPerformanceRoute, openRoute: vi.fn() });
    registerTeamPerformanceViewHandler(applyView);

    navigatePerformanceView("overview");

    expect(openPerformanceRoute).toHaveBeenCalledTimes(1);
    expect(applyView).toHaveBeenCalledWith("overview");
    expect(applyTeamPerformanceViewIfMounted("radar")).toBe(true);
  });
});
