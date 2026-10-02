import { describe, expect, it } from "vitest";
import { isLatestPerformanceRequest } from "./performanceLoadGuard";

describe("isLatestPerformanceRequest", () => {
  it("returns true only for matching request id", () => {
    expect(isLatestPerformanceRequest(2, 2)).toBe(true);
    expect(isLatestPerformanceRequest(1, 2)).toBe(false);
  });
});
