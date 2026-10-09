import {
  enrichInboxEvent,
  inboxActionRequiredForType,
  inboxSourceForType,
} from "../domain/inbox/actionInboxModel";
import { collapseIntegrationProblemDuplicates } from "./integrationProblemMigration";
import {
  normalizeStoredNotificationEvent,
  severityForNotificationType,
  type NotificationEvent,
  type NotificationEventType,
  type NotificationSeverity,
  type NotificationTarget,
  type ActionInboxSource,
} from "./notificationTypes";

const STORAGE_KEY = "metrio-notification-events";
export const NOTIFICATION_EVENT_LIMIT = 100;
export const NOTIFICATION_EVENTS_CHANGED = "metrio-notification-events-changed";

const DEDUPE_UPSERT_TYPES: NotificationEventType[] = [
  "integration_problem",
  "feedback_action",
  "bamboo_document_action",
  "bamboo_onboarding_action",
];

export type {
  NotificationEvent,
  NotificationEventType,
  NotificationTarget,
  NotificationSeverity,
};

function notifyStoreChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENTS_CHANGED));
}

function readRawEvents(): NotificationEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) =>
      normalizeStoredNotificationEvent(item as NotificationEvent),
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[notifications] persistence read failed", error);
    }
    throw new NotificationPersistenceError();
  }
}

function writeEvents(events: NotificationEvent[]): void {
  if (typeof localStorage === "undefined") return;
  // Collapse duplicate integration incidents on every persist (idempotent).
  const normalized = collapseIntegrationProblemDuplicates(events).slice(
    0,
    NOTIFICATION_EVENT_LIMIT,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  notifyStoreChanged();
}

/** Replace the full notification list (hydration / scrub). Triggers listeners. */
export function replaceNotificationEvents(events: NotificationEvent[]): void {
  writeEvents(events);
}

export class NotificationPersistenceError extends Error {
  constructor() {
    super("notification persistence read failed");
    this.name = "NotificationPersistenceError";
  }
}

export function listNotificationEvents(): NotificationEvent[] {
  try {
    return readRawEvents();
  } catch {
    return [];
  }
}

export function listNotificationEventsOrThrow(): NotificationEvent[] {
  return readRawEvents();
}

export function countUnreadNotificationEvents(): number {
  return listNotificationEvents().filter((event) => {
    if (event.readAt) return false;
    // Live-state integration incidents: ignore resolved / restored leftovers.
    if (event.type === "integration_problem") {
      if (event.resolvedAt) return false;
      if (event.dedupeKey?.endsWith(":restored")) return false;
    }
    return true;
  }).length;
}

export interface RecordNotificationEventInput {
  type: NotificationEventType;
  title: string;
  message: string;
  createdAt?: string;
  readAt?: string;
  personId?: string;
  personName?: string;
  issueKey?: string;
  issueTitle?: string;
  severity?: NotificationSeverity;
  target?: NotificationTarget;
  dedupeKey?: string;
  source?: ActionInboxSource;
  actionRequired?: boolean;
}

function buildEventFromInput(
  input: RecordNotificationEventInput,
  id?: string,
): NotificationEvent {
  const type = input.type;
  return enrichInboxEvent({
    id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    createdAt: input.createdAt ?? new Date().toISOString(),
    readAt: input.readAt,
    title: input.title,
    message: input.message,
    personId: input.personId,
    personName: input.personName,
    issueKey: input.issueKey,
    issueTitle: input.issueTitle,
    severity: input.severity ?? severityForNotificationType(type),
    target: input.target,
    dedupeKey: input.dedupeKey,
    source: input.source ?? inboxSourceForType(type),
    actionRequired: input.actionRequired ?? inboxActionRequiredForType(type),
  });
}

export function recordNotificationEvent(
  input: RecordNotificationEventInput,
): NotificationEvent {
  const events = listNotificationEvents();

  if (input.dedupeKey && DEDUPE_UPSERT_TYPES.includes(input.type)) {
    const existingIdx = events.findIndex(
      (event) =>
        event.dedupeKey === input.dedupeKey && !event.resolvedAt,
    );
    if (existingIdx >= 0) {
      const existing = events[existingIdx];
      const updated = enrichInboxEvent({
        ...existing,
        title: input.title,
        message: input.message,
        severity: input.severity ?? existing.severity,
        target: input.target ?? existing.target,
        issueKey: input.issueKey ?? existing.issueKey,
        issueTitle: input.issueTitle ?? existing.issueTitle,
        personId: input.personId ?? existing.personId,
        personName: input.personName ?? existing.personName,
        source: input.source ?? existing.source,
        actionRequired:
          input.actionRequired ??
          existing.actionRequired ??
          inboxActionRequiredForType(input.type),
      });
      // Drop sibling rows with the same dedupe key (legacy duplicate writes).
      const rest = events.filter(
        (event, index) =>
          index !== existingIdx &&
          !(event.dedupeKey === input.dedupeKey && !event.resolvedAt),
      );
      writeEvents([updated, ...rest]);
      return updated;
    }
  }

  const event = buildEventFromInput(input);
  writeEvents([event, ...events]);
  if (import.meta.env.DEV && input.dedupeKey) {
    console.debug("[notifications] recorded", input.type, input.dedupeKey);
  }
  return event;
}

export function markNotificationEventRead(id: string): void {
  const events = listNotificationEvents().map((event) =>
    event.id === id && !event.readAt
      ? { ...event, readAt: new Date().toISOString() }
      : event,
  );
  writeEvents(events);
}

export function markInboxJiraEventsReadForIssueKey(issueKey: string): void {
  const now = new Date().toISOString();
  const events = listNotificationEvents().map((event) =>
    event.issueKey === issueKey &&
    (event.type === "jira_assignment" || event.type === "jira_reassignment") &&
    !event.readAt
      ? { ...event, readAt: now }
      : event,
  );
  writeEvents(events);
}

export function markAllJiraAssignmentInboxEventsRead(): void {
  const now = new Date().toISOString();
  const events = listNotificationEvents().map((event) =>
    (event.type === "jira_assignment" || event.type === "jira_reassignment") &&
    !event.readAt
      ? { ...event, readAt: now }
      : event,
  );
  writeEvents(events);
}

export function resolveNotificationByDedupeKey(
  dedupeKey: string,
  resolvedAt?: string,
): void {
  const now = resolvedAt ?? new Date().toISOString();
  const events = listNotificationEvents().map((event) =>
    event.dedupeKey === dedupeKey && !event.resolvedAt
      ? { ...event, resolvedAt: now }
      : event,
  );
  writeEvents(events);
}

/** Hard-delete notifications matching any of the dedupe keys (live-state recovery). */
export function removeNotificationEventsByDedupeKeys(dedupeKeys: string[]): void {
  if (dedupeKeys.length === 0) return;
  const drop = new Set(dedupeKeys);
  const events = listNotificationEvents();
  const next = events.filter(
    (event) => !event.dedupeKey || !drop.has(event.dedupeKey),
  );
  if (next.length === events.length) return;
  writeEvents(next);
}

export function syncTrayBambooInboxActions(
  actions: { id: string; label: string }[],
): void {
  const activeIds = new Set(actions.map((action) => action.id));
  let events = listNotificationEvents();
  const now = new Date().toISOString();

  for (const action of actions) {
    const dedupeKey = `bamboo:action:${action.id}`;
    const existingIdx = events.findIndex(
      (event) => event.dedupeKey === dedupeKey && !event.resolvedAt,
    );
    if (existingIdx >= 0) {
      const existing = events[existingIdx];
      if (existing.message !== action.label || existing.title !== action.label) {
        const updated = enrichInboxEvent({
          ...existing,
          title: "Document requires signature",
          message: action.label,
        });
        events = events.map((event, index) =>
          index === existingIdx ? updated : event,
        );
      }
      continue;
    }
    const created = buildEventFromInput({
      type: "bamboo_document_action",
      title: "Document requires signature",
      message: action.label,
      dedupeKey,
      target: { kind: "bamboo" },
      actionRequired: true,
    });
    events = [created, ...events];
  }

  events = events.map((event) => {
    if (
      event.type !== "bamboo_document_action" ||
      event.resolvedAt ||
      !event.dedupeKey?.startsWith("bamboo:action:")
    ) {
      return event;
    }
    const id = event.dedupeKey.slice("bamboo:action:".length);
    if (!activeIds.has(id)) {
      return { ...event, resolvedAt: now };
    }
    return event;
  });

  writeEvents(events);
}

export function markAllNotificationEventsRead(): void {
  const now = new Date().toISOString();
  const events = listNotificationEvents().map((event) =>
    event.readAt ? event : { ...event, readAt: now },
  );
  writeEvents(events);
}

export function clearNotificationHistory(): void {
  writeEvents([]);
}

export function clearNotificationEventsForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  notifyStoreChanged();
}

export function seedNotificationEventsForTests(events: NotificationEvent[]): void {
  writeEvents(events);
}

/**
 * Test helper: write events without collapsing integration duplicates.
 * Used to simulate legacy persisted stores that predate singleton upsert.
 */
export function seedRawNotificationEventsForTests(
  events: NotificationEvent[],
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  notifyStoreChanged();
}
