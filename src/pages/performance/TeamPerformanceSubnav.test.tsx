import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamPerformanceSubnav } from "./TeamPerformanceSubnav";

describe("TeamPerformanceSubnav", () => {
  it("lists History reports immediately after Goals", () => {
    render(<TeamPerformanceSubnav activeView="overview" onChange={vi.fn()} />);
    const tabs = screen
      .getAllByRole("button")
      .map((tab) => tab.textContent?.trim())
      .filter(Boolean);
    const goalsIndex = tabs.indexOf("Goals");
    expect(goalsIndex).toBeGreaterThanOrEqual(0);
    expect(tabs[goalsIndex + 1]).toBe("History reports");
  });
});
