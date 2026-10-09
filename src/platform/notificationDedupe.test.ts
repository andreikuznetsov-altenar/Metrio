// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearNotificationEventsForTests,
  countUnreadNotificationEvents,
  deleteNotificationEvent,
  hydrateNotificationEventsFromStorage,
  recordNotificationEvent,
  seedNotificationEventsForTests,
  seedRawNotificationEventsForTests,
  tryRecordNotificationEvent,
} from "./notificationEvents";
import {
  clearNotificationSuppressionsForTests,
  listNotificationSuppressions,
} from "./notificationSuppressions";
import {
  collapseSemanticNotificationDuplicates,
  localNotificationCalendarDay,
  workloadDedupeKey,
} from "./notificationDedupe";
import {
  collectPersonNotificationTransitions,
  processNotificationTransitions,
} from "./notifications";
import { deleteActionInboxItem } from "./inboxReadSync";
import type { Person } from "../domain/people/types";
import { testKpi, testWorkload } from "../domain/testFixtures";
import { dispatchNativeNotification } from "./notificationNativeDispatch";
import { buildWorkloadEvent } from "../test/notificationEventFactory";

vi.mock("./notificationNativeDispatch", () => ({
  dispatchNativeNotification: vi.fn(async () => true),
}));

const prefsMemory = vi.hoisted(() => ({ current: null as import("./preferences").AppPreferences | null }));

vi.mock("./preferences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./preferences")>();
  return {
    ...actual,
    loadPreferences: vi.fn(async () => {
      if (!prefsMemory.current) {
        prefsMemory.current = { ...actual.DEFAULT_PREFERENCES };
      }
      return prefsMemory.current;
    }),
    savePreferences: vi.fn(async (prefs: import("./preferences").AppPreferences) => {
      prefsMemory.current = prefs;
    }),
  };
});

import { DEFAULT_PREFERENCES as PREFS, loadPreferences, savePreferences } from "./preferences";

function person(
  id: string,
  name: string,
  workload: Person["workload"]["level"],
): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: name,
      firstName: name,
      lastName: "",
      workEmail: `${id}@co.com`,
      jobTitle: "Eng",
      status: "Active",
    },
    jira: {
      accountId: id,
      displayName: name,
      email: `${id}@co.com`,
      canonicalKey: id,
    },
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: testWorkload({ level: workload }),
    performance: testKpi(),
    issues: [],
  };
}

describe("notification dedupe PASS 15.5F", () => {
  beforeEach(async () => {
    clearNotificationEventsForTests();
    clearNotificationSuppressionsForTests();
    prefsMemory.current = { ...PREFS };
    await savePreferences({ ...PREFS });
    vi.mocked(dispatchNativeNotification).mockClear();
  });

  afterEach(() => {
    clearNotificationEventsForTests();
    clearNotificationSuppressionsForTests();
  });

  it("A/B: identical active workload events collapse to one card with stable createdAt", () => {
    const prefs = {
      ...PREFS,
      notificationState: {
        ...PREFS.notificationState,
        workloadLevels: { andrei: "normal" },
      },
    };
    const p = person("andrei", "Andrei Kuznetsov", "overloaded");
    const first = tryRecordNotificationEvent(
      {
        type: "workload_change",
        title: "Workload changed",
        message: "Andrei Kuznetsov is overloaded",
        personId: "andrei",
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      },
      { prefs },
    )!;
    const second = tryRecordNotificationEvent(
      {
        type: "workload_change",
        title: "Workload changed",
        message: "Andrei Kuznetsov is overloaded",
        personId: "andrei",
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      },
      { prefs },
    )!;
    expect(second.event.id).toBe(first.event.id);
    expect(second.event.createdAt).toBe(first.event.createdAt);
    expect(second.isNew).toBe(false);
    void prefs;
    void p;
  });

  it("C: repeated transition processing does not dispatch native twice", async () => {
    const prefs = {
      ...PREFS,
      notifications: {
        ...PREFS.notifications,
        workloadAlerts: true,
      },
      notificationState: {
        ...PREFS.notificationState,
        workloadLevels: { "1": "normal" },
      },
    };
    const p = person("1", "Sam", "overloaded");
    const afterFirst = await processNotificationTransitions([p], prefs);
    await processNotificationTransitions([p], afterFirst);
    expect(dispatchNativeNotification).toHaveBeenCalledTimes(1);
  });

  it("D/E: delete suppresses same-day workload recreation after restart", async () => {
    const prefs = {
      ...PREFS,
      notificationState: {
        ...PREFS.notificationState,
        workloadLevels: { andrei: "normal" },
      },
    };
    await savePreferences(prefs);
    const event = recordNotificationEvent({
      type: "workload_change",
      title: "Workload changed",
      message: "Andrei Kuznetsov is overloaded",
      personId: "andrei",
      dedupeKey: workloadDedupeKey("andrei", "overloaded"),
    });
    await deleteActionInboxItem(event);
    const stored = await loadPreferences();
    const today = localNotificationCalendarDay(stored);
    expect(stored.notificationState.workloadNotificationLocalDay?.andrei).toBe(
      today,
    );
    const blocked = tryRecordNotificationEvent(
      {
        type: "workload_change",
        title: "Workload changed",
        message: "Andrei Kuznetsov is overloaded",
        personId: "andrei",
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      },
      { prefs: stored },
    );
    expect(blocked).toBeNull();
  });

  it("F: next local day after delete allows workload notification again", async () => {
    const yesterday = new Date("2026-10-08T12:00:00Z");
    const prefs = {
      ...PREFS,
      notificationState: {
        ...PREFS.notificationState,
        workloadNotificationLocalDay: {
          andrei: localNotificationCalendarDay(PREFS, yesterday),
        },
        workloadLevels: { andrei: "normal" },
      },
    };
    const created = tryRecordNotificationEvent(
      {
        type: "workload_change",
        title: "Workload changed",
        message: "Andrei Kuznetsov is overloaded",
        personId: "andrei",
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      },
      { prefs },
    );
    expect(created?.isNew).toBe(true);
  });

  it("G: undeleted card survives next day without duplicating", () => {
    const createdAt = "2026-10-08T10:00:00.000Z";
    recordNotificationEvent({
      type: "workload_change",
      title: "Workload changed",
      message: "Andrei Kuznetsov is overloaded",
      personId: "andrei",
      createdAt,
      dedupeKey: workloadDedupeKey("andrei", "overloaded"),
    });
    const again = tryRecordNotificationEvent(
      {
        type: "workload_change",
        title: "Workload changed",
        message: "Andrei Kuznetsov is overloaded",
        personId: "andrei",
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      },
      { prefs: PREFS },
    );
    expect(again?.isNew).toBe(false);
    expect(again?.event.createdAt).toBe(createdAt);
  });

  it("H: different people remain separate workload events", () => {
    const a = recordNotificationEvent({
      type: "workload_change",
      title: "Workload changed",
      message: "A is overloaded",
      personId: "a",
      dedupeKey: workloadDedupeKey("a", "overloaded"),
    });
    const b = recordNotificationEvent({
      type: "workload_change",
      title: "Workload changed",
      message: "B is overloaded",
      personId: "b",
      dedupeKey: workloadDedupeKey("b", "overloaded"),
    });
    expect(a.id).not.toBe(b.id);
    expect(
      tryRecordNotificationEvent({
        type: "workload_change",
        title: "x",
        message: "x",
        dedupeKey: workloadDedupeKey("a", "overloaded"),
      })?.isNew,
    ).toBe(false);
  });

  it("I: different semantic dedupe keys remain separate", () => {
    recordNotificationEvent({
      type: "task_attention",
      title: "Task",
      message: "one",
      dedupeKey: "task-attention:1:UX-1:problematic",
    });
    recordNotificationEvent({
      type: "task_attention",
      title: "Task",
      message: "two",
      dedupeKey: "task-attention:1:UX-2:problematic",
    });
    expect(
      tryRecordNotificationEvent({
        type: "task_attention",
        title: "Task",
        message: "one",
        dedupeKey: "task-attention:1:UX-1:problematic",
      })?.isNew,
    ).toBe(false);
  });

  it("J: legacy duplicates collapse on hydration without forcing unread", () => {
    seedRawNotificationEventsForTests([
      buildWorkloadEvent({
        id: "old",
        createdAt: "2026-10-01T10:00:00.000Z",
        readAt: new Date().toISOString(),
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      }),
      buildWorkloadEvent({
        id: "new",
        createdAt: "2026-10-02T10:00:00.000Z",
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      }),
    ]);
    hydrateNotificationEventsFromStorage();
    const events = recordNotificationEvent({
      type: "workload_change",
      title: "Workload changed",
      message: "Andrei Kuznetsov is overloaded",
      personId: "andrei",
      dedupeKey: workloadDedupeKey("andrei", "overloaded"),
    });
    expect(events.id).toBe("old");
    expect(countUnreadNotificationEvents()).toBe(0);
  });

  it("K: unread badge ignores read duplicates after collapse", () => {
    const collapsed = collapseSemanticNotificationDuplicates([
      buildWorkloadEvent({ readAt: undefined }),
      buildWorkloadEvent({
        id: "dup",
        createdAt: new Date().toISOString(),
        readAt: new Date().toISOString(),
      }),
    ]);
    seedNotificationEventsForTests(collapsed);
    expect(countUnreadNotificationEvents()).toBe(1);
  });

  it("collectPersonNotificationTransitions uses workload dedupe keys", () => {
    const prefs = {
      ...PREFS,
      notificationState: {
        ...PREFS.notificationState,
        workloadLevels: { andrei: "normal" },
      },
    };
    const { descriptors } = collectPersonNotificationTransitions(
      [person("andrei", "Andrei Kuznetsov", "overloaded")],
      prefs,
    );
    expect(descriptors[0]?.dedupeKey).toBe(
      workloadDedupeKey("andrei", "overloaded"),
    );
  });

  it("delete records suppression tombstone metadata", () => {
    const event = recordNotificationEvent({
      type: "workload_change",
      title: "Workload changed",
      message: "Andrei Kuznetsov is overloaded",
      dedupeKey: workloadDedupeKey("andrei", "overloaded"),
    });
    deleteNotificationEvent(event.id);
    expect(listNotificationSuppressions()).toEqual([
      expect.objectContaining({
        dedupeKey: workloadDedupeKey("andrei", "overloaded"),
      }),
    ]);
  });
});
