// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { navigatePerformanceView } from "./actionNavigation";
import { readIntendedTeamPerformanceView } from "./performanceViewPersistence";

describe("navigatePerformanceView", () => {
  it("queues intended team tab before route navigation so Performance mounts on the right view", () => {
    const routes: string[] = [];
    const tabs: string[] = [];
    window.addEventListener("metrio-navigate-route", (event) => {
      routes.push((event as CustomEvent<string>).detail);
      expect(readIntendedTeamPerformanceView()).toBe("delivery-risk");
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
    expect(readIntendedTeamPerformanceView()).toBe("delivery-risk");
  });
});
