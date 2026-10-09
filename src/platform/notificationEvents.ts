import {
  enrichInboxEvent,
  inboxActionRequiredForType,
  inboxSourceForType,
} from "../domain/inbox/actionInboxModel";
import { collapseIntegrationProblemDuplicates } from "./integrationProblemMigration";
import {
  collapseSemanticNotificationDuplicates,
  DEDUPE_UPSERT_TYPES,
  findActiveNotificationByDedupeKey,
  isWorkloadNotificationSuppressedToday,
  localNotificationCalendarDay,
} from "./notificationDedupe";
import {
  normalizeStoredNotificationEvent,
  severityForNotificationType,
  type NotificationEvent,
  type NotificationEventType,
  type NotificationSeverity,
  type NotificationTarget,
  type ActionInboxSource,
} from "./notificationTypes";
import type { AppPreferences } from "./preferences";
import { recordNotificationSuppression } from "./notificationSuppressions";

const STORAGE_KEY = "metrio-notification-events";
export const NOTIFICATION_EVENT_LIMIT = 100;
export const NOTIFICATION_EVENTS_CHANGED = "metrio-notification-events-changed";

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

function normalizePersistedEvents(events: NotificationEvent[]): NotificationEvent[] {
  return collapseSemanticNotificationDuplicates(
    collapseIntegrationProblemDuplicates(events),
  );
}

function writeEvents(events: NotificationEvent[]): void {
  if (typeof localStorage === "undefined") return;
  const normalized = normalizePersistedEvents(events).slice(
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
    if (event.readAt || event.deletedAt) return false;
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

export interface RecordNotificationContext {
  prefs?: AppPreferences;
}

export interface RecordNotificationResult {
  event: NotificationEvent;
  isNew: boolean;
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

function upsertIntegrationStyleEvent(
  events: NotificationEvent[],
  input: RecordNotificationEventInput,
  existingIdx: number,
): NotificationEvent[] {
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
    createdAt: existing.createdAt,
    readAt: existing.readAt,
  });
  const dedupeKey = input.dedupeKey;
  return events
    .map((event, index) => {
      if (index === existingIdx) return updated;
      if (dedupeKey && event.dedupeKey === dedupeKey && !event.resolvedAt) {
        return null;
      }
      return event;
    })
    .filter((event): event is NotificationEvent => event != null);
}

export function tryRecordNotificationEvent(
  input: RecordNotificationEventInput,
  context?: RecordNotificationContext,
): RecordNotificationResult | null {
  const events = listNotificationEvents();
  const dedupeKey = input.dedupeKey?.trim();

  if (dedupeKey && DEDUPE_UPSERT_TYPES.includes(input.type)) {
    const existingIdx = events.findIndex(
      (event) => event.dedupeKey === dedupeKey && !event.resolvedAt,
    );
    if (existingIdx >= 0) {
      const next = upsertIntegrationStyleEvent(events, input, existingIdx);
      writeEvents(next);
      const updated = next.find(
        (event) => event.dedupeKey === dedupeKey && !event.resolvedAt,
      )!;
      return { event: updated, isNew: false };
    }
  }

  if (dedupeKey) {
    const existing = findActiveNotificationByDedupeKey(events, dedupeKey);
    if (existing) {
      return { event: existing, isNew: false };
    }

    if (
      input.type === "workload_change" &&
      input.personId &&
      context?.prefs &&
      isWorkloadNotificationSuppressedToday(input.personId, context.prefs)
    ) {
      return null;
    }
  }

  const event = buildEventFromInput(input);
  writeEvents([event, ...events]);
  if (import.meta.env.DEV && dedupeKey) {
    console.debug("[notifications] recorded", input.type, dedupeKey);
  }
  return { event, isNew: true };
}

export function recordNotificationEvent(
  input: RecordNotificationEventInput,
  context?: RecordNotificationContext,
): NotificationEvent {
  const result = tryRecordNotificationEvent(input, context);
  if (!result) {
    throw new Error("notification suppressed");
  }
  return result.event;
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

export function deleteNotificationEvent(id: string): NotificationEvent | null {
  const events = listNotificationEvents();
  const target = events.find((event) => event.id === id);
  if (!target) return null;
  writeEvents(events.filter((event) => event.id !== id));
  if (target.dedupeKey) {
    recordNotificationSuppression(target.dedupeKey);
  }
  return target;
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
          createdAt: existing.createdAt,
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

/** Hydrate persisted inbox rows (collapse legacy semantic duplicates). */
export function hydrateNotificationEventsFromStorage(): boolean {
  const before = listNotificationEventsOrThrow();
  const after = normalizePersistedEvents(before);
  const changed =
    after.length !== before.length ||
    after.some((event, index) => event.id !== before[index]?.id);
  if (!changed) return false;
  if (typeof localStorage === "undefined") return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(after));
  notifyStoreChanged();
  return true;
}

export function touchWorkloadNotificationLocalDay(
  prefs: AppPreferences,
  personId: string,
  at = new Date(),
): AppPreferences["notificationState"] {
  const key = String(personId).trim();
  if (!key) return prefs.notificationState;
  const day = localNotificationCalendarDay(prefs, at);
  return {
    ...prefs.notificationState,
    workloadNotificationLocalDay: {
      ...prefs.notificationState.workloadNotificationLocalDay,
      [key]: day,
    },
  };
}
