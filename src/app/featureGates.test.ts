import { beforeEach, describe, expect, it } from "vitest";
import {
  isFeedbackEnabled,
  isPerformanceApproved,
  setPerformanceApproved,
} from "./featureGates";

describe("featureGates", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("enables feedback when performance is approved by default", () => {
    expect(isPerformanceApproved()).toBe(true);
    expect(isFeedbackEnabled()).toBe(true);
  });

  it("hides feedback when performance is not approved", () => {
    setPerformanceApproved(false);
    expect(isPerformanceApproved()).toBe(false);
    expect(isFeedbackEnabled()).toBe(false);
  });

  it("can re-enable feedback after approval", () => {
    setPerformanceApproved(false);
    setPerformanceApproved(true);
    expect(isFeedbackEnabled()).toBe(true);
  });

  it("respects company feature flag", () => {
    expect(isFeedbackEnabled({ feedback: false })).toBe(false);
    expect(isFeedbackEnabled({ feedback: true })).toBe(true);
  });
});
