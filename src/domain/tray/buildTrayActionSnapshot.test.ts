import { describe, expect, it } from "vitest";
import { buildTrayActionSnapshot } from "./buildTrayActionSnapshot";
import { buildTraySummaryModel } from "./buildTraySummaryModel";

describe("buildTrayActionSnapshot", () => {
  it("omits tray title when zero unread notifications", () => {
    const summary = buildTraySummaryModel({
      role: "employee",
      openTaskCount: 3,
      problemTaskCount: 1,
      indexLabel: "Personal index",
      indexValue: "Healthy",
      indexAvailable: true,
      unreadNotificationCount: 0,
    });
    const snapshot = buildTrayActionSnapshot(summary);
    expect(snapshot.trayTitle).toBeUndefined();
  });

  it("shows numeric tray title for unread notifications", () => {
    const summary = buildTraySummaryModel({
      role: "manager",
      openTaskCount: 14,
      problemTaskCount: 2,
      indexLabel: "Team index",
      indexValue: "Watch",
      indexAvailable: true,
      unreadNotificationCount: 4,
    });
    const snapshot = buildTrayActionSnapshot(summary);
    expect(snapshot.trayTitle).toBe("4");
  });
});
