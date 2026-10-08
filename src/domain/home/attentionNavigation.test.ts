import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppNavigationState, resetAppNavigationStateForTests } from "../../app/navigationStore";
import {
  navigateOpenTeamWorkloadSection,
  PERFORMANCE_SCROLL_TARGETS,
} from "./attentionNavigation";

describe("navigateOpenTeamWorkloadSection", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens overview and scrolls to team workload", () => {
    vi.useFakeTimers();
    resetAppNavigationStateForTests({ route: "home", performanceView: "radar" });
    const section = document.createElement("section");
    section.id = PERFORMANCE_SCROLL_TARGETS.teamWorkload;
    const scrollIntoView = vi.fn();
    section.scrollIntoView = scrollIntoView;
    document.body.appendChild(section);

    navigateOpenTeamWorkloadSection();

    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "overview",
    });

    vi.advanceTimersByTime(150);
    expect(scrollIntoView).toHaveBeenCalled();

    section.remove();
    resetAppNavigationStateForTests();
  });
});
