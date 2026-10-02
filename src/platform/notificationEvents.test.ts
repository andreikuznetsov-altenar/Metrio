import { describe, expect, it, beforeEach } from "vitest";
import {
  clearNotificationEventsForTests,
  clearNotificationHistory,
  countUnreadNotificationEvents,
  listNotificationEvents,
  markAllNotificationEventsRead,
  markNotificationEventRead,
  NOTIFICATION_EVENT_LIMIT,
  recordNotificationEvent,
  seedNotificationEventsForTests,
} from "./notificationEvents";
import { buildTaskAttentionEvent, buildWorkloadEvent } from "../test/notificationEventFactory";

describe("notificationEvents", () => {
  beforeEach(() => {
    clearNotificationEventsForTests();
  });

  it("records events and allows repeated dedupe keys after separate transitions", () => {
    recordNotificationEvent({
      type: "task_attention",
      title: "Task needs attention",
      message: "UX-5446 · Sam",
      dedupeKey: "task:UX-5446",
      issueKey: "UX-5446",
    });
    recordNotificationEvent({
      type: "task_attention",
      title: "Task needs attention",
      message: "UX-5446 · Sam",
      dedupeKey: "task:UX-5446",
      issueKey: "UX-5446",
    });
    expect(listNotificationEvents()).toHaveLength(2);
  });

  it("tracks unread count and mark read", () => {
    const event = recordNotificationEvent({
      type: "vacation_return",
      title: "Return",
      message: "Nikita returns today",
      dedupeKey: "returns:1",
      personId: "1",
    });
    expect(countUnreadNotificationEvents()).toBe(1);
    markNotificationEventRead(event.id);
    expect(countUnreadNotificationEvents()).toBe(0);
    markAllNotificationEventsRead();
  });

  it("clears history", () => {
    recordNotificationEvent({
      type: "workload_change",
      title: "Workload changed",
      message: "Sam",
      dedupeKey: "w:1",
    });
    clearNotificationHistory();
    expect(listNotificationEvents()).toHaveLength(0);
  });

  it("bounds stored history at 100", () => {
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

  it("migrates legacy stored event types on read", () => {
    seedNotificationEventsForTests([
      {
        id: "legacy",
        type: "problematic_task" as never,
        createdAt: new Date().toISOString(),
        title: "Problematic task",
        message: "Sam",
        navigationTarget: "person:abc",
        dedupeKey: "legacy:1",
      },
    ]);
    const [event] = listNotificationEvents();
    expect(event.type).toBe("task_attention");
    expect(event.target).toEqual({ kind: "person", personId: "abc" });
  });

  it("filters unread after seeding fixture events", () => {
    seedNotificationEventsForTests([
      buildTaskAttentionEvent({ readAt: undefined }),
      buildWorkloadEvent({ readAt: new Date().toISOString() }),
    ]);
    expect(countUnreadNotificationEvents()).toBe(1);
  });
});
