import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearNotificationEventsForTests,
  countUnreadNotificationEvents,
  listNotificationEvents,
  seedRawNotificationEventsForTests,
} from "./notificationEvents";
import {
  hydrateIntegrationProblemNotifications,
  setIntegrationProblem,
} from "./integrationProblemNotifications";
import {
  normalizeIntegrationProblemEvents,
} from "./integrationProblemMigration";
import { buildTaskAttentionEvent, buildVacationEvent } from "../test/notificationEventFactory";
import type { NotificationEvent } from "./notificationTypes";
import * as nativeDispatch from "./notificationNativeDispatch";

function jiraProblem(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    id: overrides.id ?? `jira-${Math.random().toString(36).slice(2, 7)}`,
    type: "integration_problem",
    title: "Jira connection problem",
    message: "Jira data could not be refreshed. Check Connections in Settings.",
    createdAt: overrides.createdAt ?? "2026-10-08T10:00:00.000Z",
    severity: "warning",
    source: "jira",
    actionRequired: true,
    target: { kind: "settings", section: "connections" },
    dedupeKey: overrides.dedupeKey ?? "integration_problem:jira",
    ...overrides,
  };
}

function bambooProblem(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    id: overrides.id ?? `bamboo-${Math.random().toString(36).slice(2, 7)}`,
    type: "integration_problem",
    title: "BambooHR connection problem",
    message: "BambooHR data could not be refreshed. Check Connections in Settings.",
    createdAt: overrides.createdAt ?? "2026-10-08T11:00:00.000Z",
    severity: "warning",
    source: "bamboo",
    actionRequired: true,
    target: { kind: "settings", section: "connections" },
    dedupeKey: overrides.dedupeKey ?? "integration_problem:bamboo",
    ...overrides,
  };
}

afterEach(() => {
  clearNotificationEventsForTests();
  vi.restoreAllMocks();
});

describe("integration problem hydration migration", () => {
  it("A. 3 legacy Jira unhealthy records → 1 canonical Jira card", () => {
    const events = [
      jiraProblem({
        id: "j1",
        dedupeKey: "integration:jira:unhealthy",
        createdAt: "2026-10-07T08:00:00.000Z",
      }),
      jiraProblem({
        id: "j2",
        dedupeKey: "integration_problem:jira",
        createdAt: "2026-10-08T09:00:00.000Z",
      }),
      jiraProblem({
        id: "j3",
        dedupeKey: undefined,
        createdAt: "2026-10-08T12:00:00.000Z",
      }),
    ];
    const { events: next, changed } = normalizeIntegrationProblemEvents(events, {
      jira: "unhealthy",
    });
    expect(changed).toBe(true);
    expect(next).toHaveLength(1);
    expect(next[0]?.dedupeKey).toBe("integration_problem:jira");
    expect(next[0]?.createdAt).toBe("2026-10-07T08:00:00.000Z");
  });

  it("B. legacy unhealthy + restored while Jira healthy → 0 Jira cards", () => {
    seedRawNotificationEventsForTests([
      jiraProblem({ id: "j1", dedupeKey: "integration:jira:unhealthy" }),
      jiraProblem({
        id: "j2",
        dedupeKey: "integration:jira:restored",
        title: "Jira connection restored",
        resolvedAt: "2026-10-08T13:00:00.000Z",
      }),
      jiraProblem({ id: "j3", dedupeKey: "integration_problem:jira" }),
    ]);
    hydrateIntegrationProblemNotifications({ jira: "healthy", bamboo: "healthy" });
    expect(
      listNotificationEvents().filter((event) => event.type === "integration_problem"),
    ).toHaveLength(0);
  });

  it("C. legacy duplicates while Jira unhealthy → 1 canonical active card", () => {
    seedRawNotificationEventsForTests([
      jiraProblem({ id: "j1", createdAt: "2026-10-07T08:00:00.000Z" }),
      jiraProblem({ id: "j2", createdAt: "2026-10-08T09:00:00.000Z" }),
      jiraProblem({
        id: "j3",
        dedupeKey: "integration:jira:unhealthy",
        createdAt: "2026-10-08T10:00:00.000Z",
      }),
    ]);
    hydrateIntegrationProblemNotifications({ jira: "unhealthy" });
    const events = listNotificationEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.dedupeKey).toBe("integration_problem:jira");
    expect(events[0]?.createdAt).toBe("2026-10-07T08:00:00.000Z");
  });

  it("D. Jira duplicates + Bamboo duplicates → one per source", () => {
    seedRawNotificationEventsForTests([
      jiraProblem({ id: "j1" }),
      jiraProblem({ id: "j2" }),
      bambooProblem({ id: "b1" }),
      bambooProblem({ id: "b2", dedupeKey: "integration:bamboo:unhealthy" }),
    ]);
    hydrateIntegrationProblemNotifications({
      jira: "unhealthy",
      bamboo: "unhealthy",
    });
    const keys = listNotificationEvents()
      .map((event) => event.dedupeKey)
      .sort();
    expect(keys).toEqual([
      "integration_problem:bamboo",
      "integration_problem:jira",
    ]);
  });

  it("E. migration does not change unrelated historical notifications", () => {
    const task = buildTaskAttentionEvent({ id: "task-1" });
    const vac = buildVacationEvent("vacation_upcoming", { id: "vac-1" });
    seedRawNotificationEventsForTests([
      task,
      vac,
      jiraProblem({ id: "j1" }),
      jiraProblem({ id: "j2" }),
    ]);
    hydrateIntegrationProblemNotifications({ jira: "unhealthy" });
    const ids = listNotificationEvents().map((event) => event.id).sort();
    expect(ids).toContain("task-1");
    expect(ids).toContain("vac-1");
    expect(ids.filter((id) => id.startsWith("j")).length).toBe(1);
  });

  it("F. migration is idempotent", () => {
    seedRawNotificationEventsForTests([
      jiraProblem({ id: "j1", createdAt: "2026-10-07T08:00:00.000Z" }),
      jiraProblem({ id: "j2", createdAt: "2026-10-08T09:00:00.000Z" }),
    ]);
    const first = hydrateIntegrationProblemNotifications({ jira: "unhealthy" });
    expect(first.changed).toBe(true);
    const after = listNotificationEvents()[0];
    const second = hydrateIntegrationProblemNotifications({ jira: "unhealthy" });
    expect(second.changed).toBe(false);
    expect(listNotificationEvents()[0]?.createdAt).toBe(after?.createdAt);
    expect(listNotificationEvents()[0]?.id).toBe(after?.id);
  });

  it("G. badge recalculated after dedupe", () => {
    seedRawNotificationEventsForTests([
      jiraProblem({ id: "j1" }),
      jiraProblem({ id: "j2" }),
      jiraProblem({ id: "j3" }),
      jiraProblem({ id: "j4" }),
      buildTaskAttentionEvent({
        id: "t1",
        issueKey: "UX-1",
        dedupeKey: "task-attention:person-1:UX-1:problematic",
      }),
      buildTaskAttentionEvent({
        id: "t2",
        issueKey: "UX-2",
        dedupeKey: "task-attention:person-1:UX-2:problematic",
      }),
      buildTaskAttentionEvent({
        id: "t3",
        issueKey: "UX-3",
        dedupeKey: "task-attention:person-1:UX-3:problematic",
      }),
      buildTaskAttentionEvent({
        id: "t4",
        issueKey: "UX-4",
        dedupeKey: "task-attention:person-1:UX-4:problematic",
      }),
      buildTaskAttentionEvent({
        id: "t5",
        issueKey: "UX-5",
        dedupeKey: "task-attention:person-1:UX-5:problematic",
      }),
    ]);
    expect(countUnreadNotificationEvents()).toBe(9);
    hydrateIntegrationProblemNotifications({ jira: "unhealthy" });
    expect(countUnreadNotificationEvents()).toBe(6);
    hydrateIntegrationProblemNotifications({ jira: "healthy" });
    expect(countUnreadNotificationEvents()).toBe(5);
  });

  it("H. migration does not emit native notification", () => {
    const spy = vi
      .spyOn(nativeDispatch, "dispatchNativeNotification")
      .mockResolvedValue(true);
    seedRawNotificationEventsForTests([
      jiraProblem({ id: "j1" }),
      jiraProblem({ id: "j2" }),
    ]);
    hydrateIntegrationProblemNotifications({ jira: "unhealthy" });
    expect(spy).not.toHaveBeenCalled();
    setIntegrationProblem({ source: "jira", emitNative: true });
    expect(spy).not.toHaveBeenCalled();
  });
});
