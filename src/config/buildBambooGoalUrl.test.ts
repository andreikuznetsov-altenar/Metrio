import { describe, expect, it } from "vitest";
import { buildBambooGoalUrl } from "./buildBambooGoalUrl";

describe("buildBambooGoalUrl", () => {
  it("prefers an absolute Bamboo goal URL when provided", () => {
    expect(
      buildBambooGoalUrl({
        employeeId: "42",
        goalId: "99",
        goalUrl: "https://altenar.bamboohr.com/performance/42/goals",
      }),
    ).toBe("https://altenar.bamboohr.com/performance/42/goals");
  });

  it("builds the verified SPA Goals route for the employee", () => {
    expect(
      buildBambooGoalUrl({
        employeeId: "42",
        goalId: "99",
        portalBaseUrl: "https://altenar.bamboohr.com",
      }),
    ).toBe("https://altenar.bamboohr.com/performance/42/goals");
  });

  it("does not invent a per-goal path segment", () => {
    const url = buildBambooGoalUrl({
      employeeId: "7",
      goalId: "12345",
      portalBaseUrl: "https://acme.bamboohr.com/",
    });
    expect(url).toBe("https://acme.bamboohr.com/performance/7/goals");
    expect(url).not.toContain("/goals/12345");
  });

  it("rejects missing employee id", () => {
    expect(() =>
      buildBambooGoalUrl({
        employeeId: "  ",
        portalBaseUrl: "https://altenar.bamboohr.com",
      }),
    ).toThrow(/employeeId/);
  });
});
