import { describe, expect, it } from "vitest";
import {
  filterNotificationsBySource,
  groupNotificationsForInbox,
} from "./notificationInboxDisplay";
import type { NotificationEvent } from "./notificationTypes";

function event(
  partial: Partial<NotificationEvent> & Pick<NotificationEvent, "id" | "createdAt">,
): NotificationEvent {
  return {
    type: "task_attention",
    title: "T",
    message: "M",
    ...partial,
  };
}

describe("notificationInboxDisplay", () => {
  it("sorts unread before read and newest first within unread", () => {
    const groups = groupNotificationsForInbox([
      event({ id: "r1", createdAt: "2026-10-03T12:00:00.000Z", readAt: "2026-10-03T13:00:00.000Z" }),
      event({ id: "u2", createdAt: "2026-10-03T10:00:00.000Z" }),
      event({ id: "u1", createdAt: "2026-10-03T11:00:00.000Z" }),
    ]);

    expect(groups[0].label).toBe("Unread");
    expect(groups[0].items.map((item) => item.id)).toEqual(["u1", "u2"]);
  });

  it("groups read items into Today/Yesterday/Earlier", () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = groupNotificationsForInbox([
      event({
        id: "earlier",
        createdAt: "2026-01-01T10:00:00.000Z",
        readAt: "2026-01-01T11:00:00.000Z",
      }),
      event({
        id: "today",
        createdAt: today.toISOString(),
        readAt: today.toISOString(),
      }),
      event({
        id: "yesterday",
        createdAt: yesterday.toISOString(),
        readAt: yesterday.toISOString(),
      }),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Earlier",
    ]);
  });

  it("filters by source", () => {
    const filtered = filterNotificationsBySource(
      [
        event({
          id: "j",
          createdAt: "2026-10-03T12:00:00.000Z",
          type: "jira_assignment",
          source: "jira",
        }),
        event({
          id: "m",
          createdAt: "2026-10-03T12:00:00.000Z",
          type: "daily_brief_ready",
        }),
      ],
      "jira",
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("j");
  });
});
