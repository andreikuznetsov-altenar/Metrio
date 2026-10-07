// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { navigatePerformanceView } from "./actionNavigation";
import { readPersistedTeamPerformanceView } from "./performanceViewPersistence";

describe("navigatePerformanceView", () => {
  it("persists team tab before route navigation so Performance mounts on the right view", () => {
    const routes: string[] = [];
    const tabs: string[] = [];
    window.addEventListener("metrio-navigate-route", (event) => {
      routes.push((event as CustomEvent<string>).detail);
      expect(readPersistedTeamPerformanceView()).toBe("delivery-risk");
    });
    window.addEventListener("metrio-open-performance-tab", (event) => {
      tabs.push((event as CustomEvent<string>).detail);
    });
    vi.useFakeTimers();
    try {
      navigatePerformanceView("delivery-risk");
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
    }
    expect(routes).toEqual(["performance"]);
    expect(tabs).toEqual(["delivery-risk"]);
    expect(readPersistedTeamPerformanceView()).toBe("delivery-risk");
  });
});
