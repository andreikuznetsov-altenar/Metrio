import { describe, expect, it, beforeEach } from "vitest";
import {
  clearNotificationEventsForTests,
  countUnreadNotificationEvents,
  listNotificationEvents,
  markAllNotificationEventsRead,
  markNotificationEventRead,
  NOTIFICATION_EVENT_LIMIT,
  recordNotificationEvent,
} from "./notificationEvents";

describe("notificationEvents", () => {
  beforeEach(() => {
    clearNotificationEventsForTests();
  });

  it("records a transition event once per dedupe key", () => {
    const first = recordNotificationEvent({
      type: "task_attention",
      title: "Task needs attention",
      message: "UX-5446 · Sam",
      dedupeKey: "task:UX-5446",
      issueKey: "UX-5446",
    });
    const second = recordNotificationEvent({
      type: "task_attention",
      title: "Task needs attention",
      message: "UX-5446 · Sam",
      dedupeKey: "task:UX-5446",
      issueKey: "UX-5446",
    });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(listNotificationEvents()).toHaveLength(1);
  });

  it("tracks unread count and mark read", () => {
    const event = recordNotificationEvent({
      type: "returns",
      title: "Return",
      message: "Nikita returns today",
      dedupeKey: "returns:1",
      personId: "1",
    });
    expect(countUnreadNotificationEvents()).toBe(1);
    markNotificationEventRead(event!.id);
    expect(countUnreadNotificationEvents()).toBe(0);
    markAllNotificationEventsRead();
  });

  it("bounds stored history", () => {
    for (let i = 0; i < NOTIFICATION_EVENT_LIMIT + 5; i += 1) {
      recordNotificationEvent({
        type: "workload_change",
        title: "Workload change",
        message: `Person ${i}`,
        dedupeKey: `workload:${i}`,
      });
    }
    expect(listNotificationEvents().length).toBeLessThanOrEqual(NOTIFICATION_EVENT_LIMIT);
  });
});
