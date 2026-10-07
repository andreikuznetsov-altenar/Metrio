import { afterEach, describe, expect, it, vi } from "vitest";
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
    const tabHandler = vi.fn();
    const section = document.createElement("section");
    section.id = PERFORMANCE_SCROLL_TARGETS.teamWorkload;
    const scrollIntoView = vi.fn();
    section.scrollIntoView = scrollIntoView;
    document.body.appendChild(section);

    window.addEventListener("metrio-open-performance-tab", tabHandler);
    navigateOpenTeamWorkloadSection();

    expect(tabHandler).toHaveBeenCalledTimes(1);
    expect((tabHandler.mock.calls[0][0] as CustomEvent).detail).toBe("overview");

    vi.advanceTimersByTime(150);
    expect(scrollIntoView).toHaveBeenCalled();

    window.removeEventListener("metrio-open-performance-tab", tabHandler);
    section.remove();
  });
});
