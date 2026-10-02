const STORAGE_KEY = "metrio-notification-events";
export const NOTIFICATION_EVENT_LIMIT = 50;

export type NotificationEventType =
  | "workload_change"
  | "upcoming_time_off"
  | "returns"
  | "problematic_task"
  | "task_attention";

export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  createdAt: string;
  title: string;
  message: string;
  personId?: string;
  issueKey?: string;
  navigationTarget?: string;
  readAt?: string;
  dedupeKey: string;
}

function readEvents(): NotificationEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: NotificationEvent[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, NOTIFICATION_EVENT_LIMIT)));
}

export function listNotificationEvents(): NotificationEvent[] {
  return readEvents();
}

export function countUnreadNotificationEvents(): number {
  return readEvents().filter((event) => !event.readAt).length;
}

export interface RecordNotificationEventInput {
  type: NotificationEventType;
  title: string;
  message: string;
  personId?: string;
  issueKey?: string;
  navigationTarget?: string;
  dedupeKey: string;
}

export function recordNotificationEvent(
  input: RecordNotificationEventInput,
): NotificationEvent | null {
  const events = readEvents();
  if (events.some((event) => event.dedupeKey === input.dedupeKey)) {
    return null;
  }

  const event: NotificationEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: input.type,
    createdAt: new Date().toISOString(),
    title: input.title,
    message: input.message,
    personId: input.personId,
    issueKey: input.issueKey,
    navigationTarget: input.navigationTarget,
    dedupeKey: input.dedupeKey,
  };

  writeEvents([event, ...events]);
  return event;
}

export function markNotificationEventRead(id: string): void {
  const events = readEvents().map((event) =>
    event.id === id && !event.readAt
      ? { ...event, readAt: new Date().toISOString() }
      : event,
  );
  writeEvents(events);
}

export function markAllNotificationEventsRead(): void {
  const now = new Date().toISOString();
  const events = readEvents().map((event) =>
    event.readAt ? event : { ...event, readAt: now },
  );
  writeEvents(events);
}

export function clearNotificationEventsForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
