import { describe, expect, it } from "vitest";
import { notificationActionLabel } from "./notificationActionLabel";
import type { NotificationEvent } from "./notificationTypes";

function event(partial: Partial<NotificationEvent>): NotificationEvent {
  return {
    id: "1",
    type: "task_attention",
    title: "T",
    message: "M",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("notificationActionLabel", () => {
  it("opens Jira for task attention with issue key and person target", () => {
    expect(
      notificationActionLabel(
        event({
          type: "task_attention",
          issueKey: "AGTC-105",
          target: { kind: "person", personId: "p1" },
        }),
      ),
    ).toBe("Open Jira");
  });

  it("maps targets to specific labels", () => {
    expect(
      notificationActionLabel(
        event({ target: { kind: "jira", issueKey: "UX-1" } }),
      ),
    ).toBe("Open Jira");
    expect(
      notificationActionLabel(
        event({ target: { kind: "settings", section: "connections" } }),
      ),
    ).toBe("Open Settings");
    expect(
      notificationActionLabel(
        event({ target: { kind: "person", personId: "p1" } }),
      ),
    ).toBe("View person");
    expect(notificationActionLabel(event({ target: { kind: "bamboo" } }))).toBe(
      "Open BambooHR",
    );
  });
});
