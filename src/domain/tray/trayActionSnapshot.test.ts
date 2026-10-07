import { describe, expect, it } from "vitest";
import { buildTraySummaryModel } from "./buildTraySummaryModel";
import { trayMenuItemsFromSummary } from "./trayActionSnapshot";

describe("trayMenuItemsFromSummary", () => {
  const summary = buildTraySummaryModel({
    role: "manager",
    openTaskCount: 12,
    problemTaskCount: 3,
    indexLabel: "Team index",
    indexValue: "2 delivery risks",
    indexAvailable: true,
    unreadNotificationCount: 4,
  });

  it("builds summary-first menu hierarchy", () => {
    const items = trayMenuItemsFromSummary(summary);
    const labels = items.map((item) => item.label);
    expect(labels.some((l) => l.startsWith("Open tasks"))).toBe(true);
    expect(labels.some((l) => l.startsWith("Problem tasks"))).toBe(true);
    expect(labels.some((l) => l.startsWith("Team index"))).toBe(true);
    expect(labels).toContain("Notifications\t4");
    expect(labels).toContain("Open Metrio");
    expect(labels).toContain("Refresh");
    expect(labels).toContain("Settings");
    expect(labels[labels.length - 1]).toBe("Quit");
    expect(items.some((item) => item.kind === "separator")).toBe(true);
  });

  it("omits notification count badge text when zero unread", () => {
    const zero = buildTraySummaryModel({
      ...summary,
      unreadNotificationCount: 0,
      trayTitle: undefined,
    });
    const labels = trayMenuItemsFromSummary(zero).map((item) => item.label);
    expect(labels).toContain("Notifications");
    expect(labels.some((l) => /Notifications\t0/.test(l))).toBe(false);
  });
});
