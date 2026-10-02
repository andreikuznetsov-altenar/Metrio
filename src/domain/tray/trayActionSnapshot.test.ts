import { describe, expect, it } from "vitest";
import {
  trayMenuItemsFromSnapshot,
  type TrayActionSnapshot,
} from "./trayActionSnapshot";

describe("trayMenuItemsFromSnapshot", () => {
  const base: TrayActionSnapshot = {
    unreadAssignmentCount: 2,
    trayTitle: "2",
    newTasks: [
      { issueKey: "UX-6124", title: "Sportsbook navigation" },
      { issueKey: "UX-6131", title: "Casino thumbnails" },
    ],
    activeTaskCount: 14,
    bambooActions: [{ id: "onboarding", label: "BambooHR action required", url: "https://x.bamboohr.com/" }],
    upcomingVacation: {
      id: "me",
      label: "Vacation in 6 days · 12–16 Oct",
      url: "https://x.bamboohr.com/",
    },
  };

  it("builds menu without New tasks heading", () => {
    const labels = trayMenuItemsFromSnapshot(base).map((item) => item.label);
    expect(labels.some((l) => /new task/i.test(l))).toBe(false);
    expect(labels).toContain("Open Metrio");
    expect(labels).toContain("UX-6124 · Sportsbook navigation");
    expect(labels).toContain("View all work");
    expect(labels).toContain("Active tasks · 14");
    expect(labels).toContain("BambooHR action required");
    expect(labels).toContain("Vacation in 6 days · 12–16 Oct");
    expect(labels).toContain("Refresh");
    expect(labels).toContain("Log out");
    expect(labels[labels.length - 1]).toBe("Quit");
  });

  it("uses stable jira menu ids", () => {
    const ids = trayMenuItemsFromSnapshot(base).map((item) => item.id);
    expect(ids).toContain("jira:UX-6124");
  });
});
