import { describe, expect, it } from "vitest";
import {
  feedbackCadenceUnitLabel,
  feedbackCycleStatusLabel,
  feedbackCycleTypeLabel,
} from "../domain/feedbackCycles/feedbackCycleLabels";

describe("UI Repair Pass 5G", () => {
  it("humanizes feedback cycle badges for executives", () => {
    expect(feedbackCycleTypeLabel("pulse")).toBe("Pulse");
    expect(feedbackCycleStatusLabel("active")).toBe("Active");
    expect(feedbackCadenceUnitLabel("monthly")).toBe("Monthly");
  });

  it("does not show raw snake_case cycle status in labels", () => {
    expect(feedbackCycleStatusLabel("paused")).toBe("Paused");
    expect(feedbackCycleStatusLabel("archived")).toBe("Archived");
  });
});
