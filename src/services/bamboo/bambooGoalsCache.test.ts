import { beforeEach, describe, expect, it } from "vitest";
import {
  bambooGoalsCachedEmployeeCount,
  clearBambooGoalsCache,
  getBambooGoalsCacheEntry,
  invalidateBambooGoalsCache,
  isBambooGoalsCacheFresh,
  setBambooGoalsCacheEntry,
} from "./bambooGoalsCache";

describe("bambooGoalsCache", () => {
  beforeEach(() => {
    clearBambooGoalsCache();
  });

  it("caches per employee+filter and supports TTL freshness", () => {
    setBambooGoalsCacheEntry({
      employeeId: "1",
      filter: "status-inProgress",
      goals: [],
      fetchedAt: Date.now(),
      state: "ready",
    });
    setBambooGoalsCacheEntry({
      employeeId: "2",
      filter: "status-inProgress",
      goals: [],
      fetchedAt: Date.now() - 20 * 60 * 1000,
      state: "ready",
    });
    expect(bambooGoalsCachedEmployeeCount()).toBe(2);
    expect(isBambooGoalsCacheFresh(getBambooGoalsCacheEntry("1", "status-inProgress"))).toBe(
      true,
    );
    expect(isBambooGoalsCacheFresh(getBambooGoalsCacheEntry("2", "status-inProgress"))).toBe(
      false,
    );
  });

  it("invalidates all filters for one employee after write", () => {
    setBambooGoalsCacheEntry({
      employeeId: "1",
      filter: "status-inProgress",
      goals: [],
      fetchedAt: Date.now(),
      state: "ready",
    });
    setBambooGoalsCacheEntry({
      employeeId: "1",
      filter: "status-completed",
      goals: [],
      fetchedAt: Date.now(),
      state: "ready",
    });
    setBambooGoalsCacheEntry({
      employeeId: "2",
      filter: "status-inProgress",
      goals: [],
      fetchedAt: Date.now(),
      state: "ready",
    });
    invalidateBambooGoalsCache("1");
    expect(getBambooGoalsCacheEntry("1", "status-inProgress")).toBeNull();
    expect(getBambooGoalsCacheEntry("1", "status-completed")).toBeNull();
    expect(getBambooGoalsCacheEntry("2", "status-inProgress")).not.toBeNull();
  });
});
