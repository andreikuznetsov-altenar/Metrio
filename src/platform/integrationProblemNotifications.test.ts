import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES } from "./preferences";
import { processIntegrationNotificationTransitions } from "./integrationNotificationTransitions";
import {
  clearIntegrationProblem,
  findActiveIntegrationProblem,
  integrationProblemDedupeKey,
  setIntegrationProblem,
} from "./integrationProblemNotifications";
import {
  clearNotificationEventsForTests,
  countUnreadNotificationEvents,
  listNotificationEvents,
  markNotificationEventRead,
  recordNotificationEvent,
  seedNotificationEventsForTests,
} from "./notificationEvents";
import { buildTaskAttentionEvent, buildVacationEvent } from "../test/notificationEventFactory";

vi.mock("./notificationNativeDispatch", () => ({
  dispatchNativeNotification: vi.fn(async () => true),
}));

import { dispatchNativeNotification } from "./notificationNativeDispatch";

describe("integration problem live-state lifecycle", () => {
  beforeEach(() => {
    clearNotificationEventsForTests();
    vi.mocked(dispatchNativeNotification).mockClear();
  });

  it("A. healthy → Jira failure creates one integration_problem:jira", () => {
    processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    const events = listNotificationEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.dedupeKey).toBe(integrationProblemDedupeKey("jira"));
    expect(events[0]?.title).toBe("Jira connection problem");
    expect(dispatchNativeNotification).toHaveBeenCalledTimes(1);
  });

  it("B. five consecutive Jira failures stay one notification", () => {
    let prefs = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    for (let i = 0; i < 4; i += 1) {
      prefs = processIntegrationNotificationTransitions(prefs, { jiraStale: true });
    }
    expect(listNotificationEvents()).toHaveLength(1);
    expect(listNotificationEvents()[0]?.dedupeKey).toBe("integration_problem:jira");
  });

  it("C. five failures increment unread only once", () => {
    let prefs = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    expect(countUnreadNotificationEvents()).toBe(1);
    for (let i = 0; i < 4; i += 1) {
      prefs = processIntegrationNotificationTransitions(prefs, { jiraStale: true });
    }
    expect(countUnreadNotificationEvents()).toBe(1);
    expect(dispatchNativeNotification).toHaveBeenCalledTimes(1);
  });

  it("D. Jira failure → success removes the Jira notification", () => {
    const failed = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    processIntegrationNotificationTransitions(failed, { jiraStale: false });
    expect(listNotificationEvents()).toHaveLength(0);
    expect(findActiveIntegrationProblem("jira")).toBeUndefined();
  });

  it("E. failure → success → failure creates one fresh incident", () => {
    const failed = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    const firstId = listNotificationEvents()[0]?.id;
    const recovered = processIntegrationNotificationTransitions(failed, {
      jiraStale: false,
    });
    processIntegrationNotificationTransitions(recovered, { jiraStale: true });
    expect(listNotificationEvents()).toHaveLength(1);
    expect(listNotificationEvents()[0]?.id).not.toBe(firstId);
    expect(countUnreadNotificationEvents()).toBe(1);
    expect(dispatchNativeNotification).toHaveBeenCalledTimes(2);
  });

  it("F. Jira failure + Bamboo failure = two source-specific cards", () => {
    const prefs = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
      bambooStale: true,
    });
    expect(prefs.notificationState.integrationHealth?.jira).toBe("unhealthy");
    expect(prefs.notificationState.integrationHealth?.bamboo).toBe("unhealthy");
    const keys = listNotificationEvents().map((event) => event.dedupeKey).sort();
    expect(keys).toEqual([
      "integration_problem:bamboo",
      "integration_problem:jira",
    ]);
  });

  it("G. Jira success does not remove Bamboo problem", () => {
    const both = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
      bambooStale: true,
    });
    processIntegrationNotificationTransitions(both, {
      jiraStale: false,
      bambooStale: true,
    });
    expect(listNotificationEvents()).toHaveLength(1);
    expect(listNotificationEvents()[0]?.dedupeKey).toBe("integration_problem:bamboo");
  });

  it("H. manual Retry failure keeps the same card without duplicate", () => {
    const failed = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    const before = listNotificationEvents()[0];
    processIntegrationNotificationTransitions(failed, { jiraStale: true });
    expect(listNotificationEvents()).toHaveLength(1);
    expect(listNotificationEvents()[0]?.createdAt).toBe(before?.createdAt);
    expect(countUnreadNotificationEvents()).toBe(1);
  });

  it("I. manual Retry success removes the card", () => {
    const failed = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    clearIntegrationProblem("jira");
    // Simulate success path also clearing via transitions
    processIntegrationNotificationTransitions(failed, { jiraStale: false });
    expect(listNotificationEvents()).toHaveLength(0);
  });

  it("J. restart/persistence with active incident keeps one notification", () => {
    processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    const persisted = listNotificationEvents();
    expect(persisted).toHaveLength(1);
    // Simulate app restart: storage already has the card; health still unhealthy.
    const restarted = {
      ...DEFAULT_PREFERENCES,
      sync: { ...DEFAULT_PREFERENCES.sync, jiraStale: true },
      notificationState: {
        ...DEFAULT_PREFERENCES.notificationState,
        integrationHealth: { jira: "unhealthy" as const, bamboo: "healthy" as const },
      },
    };
    processIntegrationNotificationTransitions(restarted, { jiraStale: true });
    expect(listNotificationEvents()).toHaveLength(1);
    expect(listNotificationEvents()[0]?.createdAt).toBe(persisted[0]?.createdAt);
  });

  it("K. restart after resolved incident does not resurrect the card", () => {
    const failed = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    processIntegrationNotificationTransitions(failed, { jiraStale: false });
    expect(listNotificationEvents()).toHaveLength(0);
    const healthyRestart = {
      ...DEFAULT_PREFERENCES,
      sync: { ...DEFAULT_PREFERENCES.sync, jiraStale: false },
      notificationState: {
        ...DEFAULT_PREFERENCES.notificationState,
        integrationHealth: { jira: "healthy" as const, bamboo: "healthy" as const },
      },
    };
    processIntegrationNotificationTransitions(healthyRestart, { jiraStale: false });
    expect(listNotificationEvents()).toHaveLength(0);
  });

  it("L. normal task/vacation notifications remain historical", () => {
    seedNotificationEventsForTests([
      buildTaskAttentionEvent({ id: "task-1" }),
      buildVacationEvent("vacation_upcoming", { id: "vac-1" }),
    ]);
    const failed = processIntegrationNotificationTransitions(DEFAULT_PREFERENCES, {
      jiraStale: true,
    });
    processIntegrationNotificationTransitions(failed, { jiraStale: false });
    const keys = listNotificationEvents().map((event) => event.id).sort();
    expect(keys).toEqual(["task-1", "vac-1"]);
  });

  it("preserves incident-start timestamp across repeated failures", () => {
    const { event } = setIntegrationProblem({ source: "jira", emitNative: false });
    const started = event.createdAt;
    setIntegrationProblem({ source: "jira", emitNative: false });
    setIntegrationProblem({ source: "jira", emitNative: false });
    expect(listNotificationEvents()[0]?.createdAt).toBe(started);
  });

  it("does not re-unread an already-read active problem on repeat failure", () => {
    const { event } = setIntegrationProblem({ source: "jira", emitNative: false });
    markNotificationEventRead(event.id);
    expect(countUnreadNotificationEvents()).toBe(0);
    setIntegrationProblem({ source: "jira", emitNative: false });
    expect(countUnreadNotificationEvents()).toBe(0);
    expect(listNotificationEvents()[0]?.readAt).toBeTruthy();
  });

  it("scrubs legacy restored cards and does not create restored on recovery", () => {
    recordNotificationEvent({
      type: "integration_problem",
      title: "Connection restored",
      message: "Jira connection is healthy again.",
      dedupeKey: "integration:jira:restored",
      severity: "success",
    });
    recordNotificationEvent({
      type: "integration_problem",
      title: "Jira connection problem",
      message: "old",
      dedupeKey: "integration:jira:unhealthy",
    });
    clearIntegrationProblem("jira");
    expect(listNotificationEvents()).toHaveLength(0);
  });
});
