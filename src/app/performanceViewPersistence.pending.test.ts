import { afterEach, describe, expect, it } from "vitest";
import {
  consumePendingTeamPerformanceView,
  readIntendedTeamPerformanceView,
  setPendingTeamPerformanceView,
  writePersistedTeamPerformanceView,
} from "./performanceViewPersistence";

afterEach(() => {
  consumePendingTeamPerformanceView();
  sessionStorage.clear();
});

describe("pending Performance view", () => {
  it("wins over a stale persisted Radar tab", () => {
    writePersistedTeamPerformanceView("radar");
    setPendingTeamPerformanceView("overview");
    expect(readIntendedTeamPerformanceView()).toBe("overview");
    expect(consumePendingTeamPerformanceView()).toBe("overview");
    expect(sessionStorage.getItem("metrio.performance.teamView.v1")).toBe("radar");
  });
});
