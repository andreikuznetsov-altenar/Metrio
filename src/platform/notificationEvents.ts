import {
  normalizeStoredNotificationEvent,
  severityForNotificationType,
  type NotificationEvent,
  type NotificationEventType,
  type NotificationSeverity,
  type NotificationTarget,
} from "./notificationTypes";

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

function writeEvents(events: NotificationEvent[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(events.slice(0, NOTIFICATION_EVENT_LIMIT)),
  );
  notifyStoreChanged();
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
  return listNotificationEvents().filter((event) => !event.readAt).length;
}

export interface RecordNotificationEventInput {
  type: NotificationEventType;
  title: string;
  message: string;
  createdAt?: string;
  personId?: string;
  personName?: string;
  issueKey?: string;
  issueTitle?: string;
  severity?: NotificationSeverity;
  target?: NotificationTarget;
  dedupeKey?: string;
}

export function recordNotificationEvent(
  input: RecordNotificationEventInput,
): NotificationEvent {
  const events = listNotificationEvents();
  const event: NotificationEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: input.type,
    createdAt: input.createdAt ?? new Date().toISOString(),
    title: input.title,
    message: input.message,
    personId: input.personId,
    personName: input.personName,
    issueKey: input.issueKey,
    issueTitle: input.issueTitle,
    severity: input.severity ?? severityForNotificationType(input.type),
    target: input.target,
    dedupeKey: input.dedupeKey,
  };

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
