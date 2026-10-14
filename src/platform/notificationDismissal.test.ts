// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearNotificationEventsForTests,
  deleteNotificationEvent,
  dismissAllNotificationEvents,
  hydrateDocFixtureNotificationEvents,
  listNotificationEvents,
  recordNotificationEvent,
  resolveNotificationByDedupeKey,
  tryRecordNotificationEvent,
  type RecordNotificationEventInput,
} from "./notificationEvents";
import {
  NotificationDismissalPersistenceError,
  SUPPRESSION_MAX_ENTRIES,
  SUPPRESSION_RETENTION_DAYS,
  clearNotificationSuppressionsForTests,
  endNotificationEpisode,
  isNotificationDismissed,
  listNotificationSuppressions,
  pruneSuppressions,
  recordNotificationSuppression,
} from "./notificationSuppressions";
import { dismissalScopeForType, findActiveNotificationByDedupeKey } from "./notificationDedupe";
import { syncFeedbackInboxFromSummary } from "./feedbackInboxSync";
import { collectPersonNotificationTransitions } from "./notifications";
import { setDocFixtureModeForTests } from "./docFixtures";
import { DEFAULT_PREFERENCES } from "./preferences";
import type { Person } from "../domain/people/types";
import { testKpi, testWorkload } from "../domain/testFixtures";

vi.mock("./notificationNativeDispatch", () => ({
  dispatchNativeNotification: vi.fn(async () => true),
}));

const jiraEvent = (assignedAt: string): RecordNotificationEventInput => ({
  type: "jira_assignment",
  title: "New task assigned",
  message: "DEMO-202 · Notification drawer recovery",
  issueKey: "DEMO-202",
  dedupeKey: `jira_assignment:DEMO-202:${assignedAt}`,
});
const vacationEvent = (start: string): RecordNotificationEventInput => ({
  type: "vacation_reminder",
  title: "Vacation starting soon",
  message: "Anna starts vacation",
  personId: "anna",
  dedupeKey: `vacation-reminder:anna:vacation_soon:${start}`,
});
const feedbackFailures: RecordNotificationEventInput = {
  type: "feedback_action",
  title: "Survey delivery failed",
  message: "2 delivery failures need attention",
  dedupeKey: "feedback:delivery-failures",
};

beforeEach(() => {
  clearNotificationEventsForTests();
  clearNotificationSuppressionsForTests();
  setDocFixtureModeForTests(null);
});
afterEach(() => {
  clearNotificationEventsForTests();
  clearNotificationSuppressionsForTests();
  setDocFixtureModeForTests(null);
  vi.restoreAllMocks();
});

describe("A/B. a deleted notification does not come back", () => {
  it("A: same source state recreated by a refresh stays dismissed", () => {
    const event = recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))!;
    deleteNotificationEvent(event.id);
    expect(listNotificationEvents()).toHaveLength(0);
    // the refresh re-evaluates the same source condition
    expect(tryRecordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))).toBeNull();
    expect(recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))).toBeNull();
    expect(listNotificationEvents()).toHaveLength(0);
  });

  it("B: survives an app restart (fresh module instances read the persisted ledger)", async () => {
    const event = recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))!;
    deleteNotificationEvent(event.id);
    vi.resetModules();
    const fresh = await import("./notificationEvents");
    expect(fresh.tryRecordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))).toBeNull();
    expect(fresh.listNotificationEvents()).toHaveLength(0);
  });
});

describe("C. semantic dedupe is preserved: a distinct event for the same issue still appears", () => {
  it("deleting the Oct 10 assignment does not suppress a later Oct 20 event for the same issue", () => {
    const first = recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))!;
    deleteNotificationEvent(first.id);
    const later = tryRecordNotificationEvent(jiraEvent("2026-10-20T09:00:00Z"));
    expect(later?.isNew).toBe(true);
    expect(listNotificationEvents()).toHaveLength(1);
    // and an identical live duplicate still collapses (existing dedupe untouched)
    expect(tryRecordNotificationEvent(jiraEvent("2026-10-20T09:00:00Z"))?.isNew).toBe(false);
  });

  it("a different vacation occurrence is a different event", () => {
    const first = recordNotificationEvent(vacationEvent("2026-10-14"))!;
    deleteNotificationEvent(first.id);
    expect(tryRecordNotificationEvent(vacationEvent("2026-10-14"))).toBeNull();
    expect(tryRecordNotificationEvent(vacationEvent("2026-12-20"))?.isNew).toBe(true);
  });
});

describe("D. other sources are unaffected", () => {
  it("deleting a Jira event keeps Bamboo/Feedback cards and their future events", () => {
    const jira = recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))!;
    recordNotificationEvent(vacationEvent("2026-10-14"));
    recordNotificationEvent(feedbackFailures);
    deleteNotificationEvent(jira.id);
    expect(listNotificationEvents().map((e) => e.type).sort()).toEqual(["feedback_action", "vacation_reminder"]);
    expect(isNotificationDismissed(vacationEvent("2026-10-14").dedupeKey)).toBe(false);
    expect(isNotificationDismissed(feedbackFailures.dedupeKey)).toBe(false);
    expect(tryRecordNotificationEvent(vacationEvent("2026-11-01"))?.isNew).toBe(true);
  });
});

describe("E. delete all / clear all", () => {
  it("dismisses every visible event for good but lets genuinely new events appear", () => {
    recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"));
    recordNotificationEvent(vacationEvent("2026-10-14"));
    recordNotificationEvent(feedbackFailures);
    dismissAllNotificationEvents();
    expect(listNotificationEvents()).toHaveLength(0);
    expect(tryRecordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))).toBeNull();
    expect(tryRecordNotificationEvent(vacationEvent("2026-10-14"))).toBeNull();
    expect(tryRecordNotificationEvent(feedbackFailures)).toBeNull();
    // not a permanent source mute
    expect(tryRecordNotificationEvent(jiraEvent("2026-10-25T10:00:00Z"))?.isNew).toBe(true);
  });
});

describe("F. dedupe and dismissal share one identity (the dedupeKey)", () => {
  it("the key that dedupes an active card is the key that dismisses it", () => {
    const event = recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))!;
    expect(findActiveNotificationByDedupeKey(listNotificationEvents(), event.dedupeKey!)?.id).toBe(event.id);
    deleteNotificationEvent(event.id);
    expect(isNotificationDismissed(event.dedupeKey)).toBe(true);
    expect(listNotificationSuppressions()).toEqual([expect.objectContaining({ dedupeKey: event.dedupeKey, scope: "event" })]);
  });

  it("scopes: live/state-derived types are episode-scoped, concrete events are event-scoped", () => {
    expect(dismissalScopeForType("integration_problem")).toBe("episode");
    expect(dismissalScopeForType("feedback_action")).toBe("episode");
    expect(dismissalScopeForType("workload_change")).toBe("episode");
    expect(dismissalScopeForType("task_attention")).toBe("episode");
    expect(dismissalScopeForType("jira_assignment")).toBe("event");
    expect(dismissalScopeForType("vacation_reminder")).toBe("event");
  });
});

describe("live/state-derived conditions: a dismissal lasts for the episode, not forever", () => {
  it("feedback: deleted delivery-failure card stays gone while failures persist, returns when they recur", () => {
    const summary = { preparedNotSent: false, pendingResponseCount: 0, deliveryFailureCount: 2, feedbackRequestedCount: 0 };
    syncFeedbackInboxFromSummary(summary);
    const card = listNotificationEvents().find((e) => e.dedupeKey === "feedback:delivery-failures")!;
    deleteNotificationEvent(card.id);
    syncFeedbackInboxFromSummary(summary); // refresh with the same failures
    syncFeedbackInboxFromSummary(summary);
    expect(listNotificationEvents()).toHaveLength(0);
    syncFeedbackInboxFromSummary({ ...summary, deliveryFailureCount: 0 }); // condition ends
    syncFeedbackInboxFromSummary(summary); // a new episode
    expect(listNotificationEvents().filter((e) => e.dedupeKey === "feedback:delivery-failures")).toHaveLength(1);
  });

  it("resolving a live-state key ends only episode tombstones", () => {
    recordNotificationSuppression("live:key", undefined, "episode");
    recordNotificationSuppression("event:key", undefined, "event");
    resolveNotificationByDedupeKey("live:key");
    resolveNotificationByDedupeKey("event:key");
    expect(isNotificationDismissed("live:key")).toBe(false);
    expect(isNotificationDismissed("event:key")).toBe(true);
    endNotificationEpisode("event:key");
    expect(isNotificationDismissed("event:key")).toBe(true);
  });

  it("workload/problematic transitions report the episodes that ended", () => {
    const p = (level: "normal" | "high", problematicCount: number): Person =>
      ({
        id: "p1",
        bamboo: { id: "p1", displayName: "Pat", firstName: "Pat", lastName: "", workEmail: "p@co.com", jobTitle: "Eng", status: "Active" },
        jira: { accountId: "p1", displayName: "Pat", email: "p@co.com", canonicalKey: "p1" },
        identity: { matchedBy: "email", warnings: [] },
        availability: { state: "available", label: "Available", isHoliday: false },
        workload: testWorkload({ level, problematicCount }),
        performance: testKpi(),
        issues: [],
      }) as unknown as Person;
    const prefs = {
      ...DEFAULT_PREFERENCES,
      notificationState: {
        ...DEFAULT_PREFERENCES.notificationState,
        workloadLevels: { p1: "high" },
        problematicCounts: { p1: 2 },
      },
    };
    const { endedEpisodes } = collectPersonNotificationTransitions([p("normal", 0)], prefs);
    expect(endedEpisodes).toEqual(expect.arrayContaining(["workload:p1:high", "problematic:p1:2", "problematic:p1:1"]));
  });
});

describe("persistence", () => {
  it("if the dismissal cannot be saved the card is kept and the error surfaces", () => {
    const event = recordNotificationEvent(jiraEvent("2026-10-10T08:00:00Z"))!;
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === "metrio-notification-suppressions") throw new Error("quota");
      return real.call(this, key, value);
    });
    expect(() => deleteNotificationEvent(event.id)).toThrow(NotificationDismissalPersistenceError);
    expect(listNotificationEvents().map((e) => e.id)).toEqual([event.id]);
  });

  it("retention is bounded but never drops recent dismissals", () => {
    const now = Date.parse("2026-10-14T00:00:00Z");
    const day = 24 * 60 * 60 * 1000;
    const rows = [
      { dedupeKey: "recent", deletedAt: new Date(now - 2 * day).toISOString() },
      { dedupeKey: "old", deletedAt: new Date(now - (SUPPRESSION_RETENTION_DAYS + 5) * day).toISOString() },
      ...Array.from({ length: SUPPRESSION_MAX_ENTRIES + 50 }, (_, i) => ({
        dedupeKey: `bulk-${i}`,
        deletedAt: new Date(now - (i % 300) * 1000 - 3 * day).toISOString(),
      })),
    ];
    const pruned = pruneSuppressions(rows, now);
    expect(pruned.length).toBeLessThanOrEqual(SUPPRESSION_MAX_ENTRIES);
    expect(pruned.some((r) => r.dedupeKey === "recent")).toBe(true);
    expect(pruned.some((r) => r.dedupeKey === "old")).toBe(false);
  });

  it("old rows without a scope still suppress (treated as event) — old installs start normally", () => {
    localStorage.setItem(
      "metrio-notification-suppressions",
      JSON.stringify([{ dedupeKey: "legacy:key", deletedAt: "2026-01-01T00:00:00Z" }]),
    );
    expect(isNotificationDismissed("legacy:key")).toBe(true);
    expect(isNotificationDismissed("another")).toBe(false);
  });
});

describe("user-reported bug: a deleted DEMO Jira notification returns after Refresh", () => {
  it("documentation/demo fixture obeys the dismissal contract on every refresh/hydrate", async () => {
    setDocFixtureModeForTests({ enabled: true, role: "lead" });
    await hydrateDocFixtureNotificationEvents();
    const review = listNotificationEvents().find((e) => e.issueKey === "DEMO-202" && e.type === "task_attention")!;
    expect(review).toBeTruthy();
    expect(review.dedupeKey).toBeTruthy();

    deleteNotificationEvent(review.id);
    expect(listNotificationEvents().some((e) => e.issueKey === "DEMO-202")).toBe(false);

    // the Refresh path re-runs the fixture hydration (twice, to be sure it is not once-only)
    await hydrateDocFixtureNotificationEvents();
    await hydrateDocFixtureNotificationEvents();
    expect(listNotificationEvents().some((e) => e.issueKey === "DEMO-202")).toBe(false);
    // unrelated demo notifications are untouched
    expect(listNotificationEvents().map((e) => e.id)).toEqual(
      expect.arrayContaining(["doc-notification-feedback", "doc-notification-vacation"]),
    );
  });
});
