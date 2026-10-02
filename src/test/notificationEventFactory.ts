import type { NotificationEvent, NotificationEventType } from "../platform/notificationTypes";
import { severityForNotificationType } from "../platform/notificationTypes";

let sequence = 0;

export function buildNotificationEvent(
  partial: Partial<NotificationEvent> & Pick<NotificationEvent, "type" | "title" | "message">,
): NotificationEvent {
  sequence += 1;
  return {
    id: partial.id ?? `test-event-${sequence}`,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    severity: partial.severity ?? severityForNotificationType(partial.type),
    ...partial,
  };
}

export function buildTaskAttentionEvent(
  overrides: Partial<NotificationEvent> = {},
): NotificationEvent {
  return buildNotificationEvent({
    type: "task_attention",
    title: "Task needs attention",
    message: "UX-5446 · Daria Chernowa",
    issueKey: "UX-5446",
    personId: "person-1",
    personName: "Daria Chernowa",
    target: { kind: "jira", issueKey: "UX-5446" },
    dedupeKey: "task-attention:person-1:UX-5446:problematic",
    ...overrides,
  });
}

export function buildWorkloadEvent(
  overrides: Partial<NotificationEvent> = {},
): NotificationEvent {
  return buildNotificationEvent({
    type: "workload_change",
    title: "Workload changed",
    message: "Alex Morgan is overloaded",
    personId: "person-alex",
    personName: "Alex Morgan",
    target: { kind: "person", personId: "person-alex" },
    dedupeKey: "workload:person-alex:overloaded",
    ...overrides,
  });
}

export function buildVacationEvent(
  type: Extract<
    NotificationEventType,
    "vacation_upcoming" | "vacation_reminder" | "vacation_return"
  >,
  overrides: Partial<NotificationEvent> = {},
): NotificationEvent {
  return buildNotificationEvent({
    type,
    title:
      type === "vacation_return"
        ? "Return from time off"
        : type === "vacation_reminder"
          ? "Vacation starting soon"
          : "Vacation started",
    message: "Sam · 12–18 Oct",
    personId: "person-3",
    personName: "Sam",
    target: { kind: "person", personId: "person-3" },
    ...overrides,
  });
}

export function buildIntegrationEvent(
  overrides: Partial<NotificationEvent> = {},
): NotificationEvent {
  return buildNotificationEvent({
    type: "integration_problem",
    title: "Jira connection problem",
    message: "Jira data could not be refreshed.",
    target: { kind: "settings", section: "connections" },
    dedupeKey: "integration:jira:unhealthy",
    ...overrides,
  });
}
