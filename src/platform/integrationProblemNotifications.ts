import {
  listNotificationEvents,
  replaceNotificationEvents,
  type NotificationEvent,
} from "./notificationEvents";
import { dispatchNativeNotification } from "./notificationNativeDispatch";
import {
  allIntegrationProblemDedupeKeys,
  collapseIntegrationProblemDuplicates,
  defaultIntegrationProblemCopy,
  integrationProblemDedupeKey,
  isIntegrationProblemForSource,
  legacyIntegrationProblemDedupeKeys,
  normalizeIntegrationProblemEvents,
  type IntegrationHealthMap,
  type IntegrationProblemSource,
} from "./integrationProblemMigration";
import { enrichInboxEvent } from "../domain/inbox/actionInboxModel";

export type { IntegrationProblemSource, IntegrationHealthMap };
export {
  allIntegrationProblemDedupeKeys,
  collapseIntegrationProblemDuplicates,
  integrationProblemDedupeKey,
  isIntegrationProblemForSource,
  legacyIntegrationProblemDedupeKeys,
  normalizeIntegrationProblemEvents,
};

function newEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function findActiveIntegrationProblem(
  source: IntegrationProblemSource,
): NotificationEvent | undefined {
  return listNotificationEvents().find(
    (event) =>
      isIntegrationProblemForSource(event, source) &&
      !event.resolvedAt &&
      !event.dedupeKey?.endsWith(":restored"),
  );
}

export interface SetIntegrationProblemInput {
  source: IntegrationProblemSource;
  title?: string;
  message?: string;
  /** When true (default), emit a native notification only for a new outage episode. */
  emitNative?: boolean;
}

export interface SetIntegrationProblemResult {
  event: NotificationEvent;
  /** True when this call opened a new outage episode (not a repeat while already failing). */
  created: boolean;
}

/**
 * Ensure exactly one active live-state problem notification for this integration.
 * Repeated failures keep the same card (incident-start `createdAt`, no unread bump, no native spam).
 * Scrubs ALL legacy/duplicate siblings for the source before writing the canonical card.
 */
export function setIntegrationProblem(
  input: SetIntegrationProblemInput,
): SetIntegrationProblemResult {
  const { source } = input;
  const copy = defaultIntegrationProblemCopy(source);
  const dedupeKey = integrationProblemDedupeKey(source);
  const title = input.title ?? copy.title;
  const message = input.message ?? copy.message;

  const all = listNotificationEvents();
  const matched = all.filter((event) =>
    isIntegrationProblemForSource(event, source),
  );
  const others = all.filter(
    (event) => !isIntegrationProblemForSource(event, source),
  );
  const active = matched.filter(
    (event) => !event.resolvedAt && !event.dedupeKey?.endsWith(":restored"),
  );
  const hadActive = active.length > 0;

  const byCreated = [...active].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const earliest = byCreated[0];
  const preferred =
    active.find((event) => event.dedupeKey === dedupeKey) ?? earliest;
  const anyUnread = active.some((event) => !event.readAt);

  const event = enrichInboxEvent({
    id: preferred?.id ?? newEventId(),
    type: "integration_problem",
    createdAt: earliest?.createdAt ?? new Date().toISOString(),
    readAt: hadActive ? (anyUnread ? undefined : preferred?.readAt) : undefined,
    title,
    message,
    severity: preferred?.severity ?? "warning",
    target: { kind: "settings", section: "connections" },
    dedupeKey,
    source,
    actionRequired: true,
  });

  replaceNotificationEvents([event, ...others]);

  if (!hadActive && input.emitNative !== false) {
    void dispatchNativeNotification({ title, body: message }).catch(
      () => undefined,
    );
  }

  return { event, created: !hadActive };
}

/**
 * Remove the active integration-problem card for this source entirely.
 * No "connection restored" history card. Scrubs legacy IDs and title matches too.
 */
export function clearIntegrationProblem(source: IntegrationProblemSource): void {
  const all = listNotificationEvents();
  const next = all.filter(
    (event) => !isIntegrationProblemForSource(event, source),
  );
  if (next.length !== all.length) {
    replaceNotificationEvents(next);
  }
}

/** Hide resolved / restored integration cards left over from older builds. */
export function isActiveIntegrationProblemNotification(
  event: NotificationEvent,
): boolean {
  if (event.type !== "integration_problem") return true;
  if (event.resolvedAt) return false;
  if (event.dedupeKey?.endsWith(":restored")) return false;
  return true;
}

export interface HydrateIntegrationProblemsResult {
  changed: boolean;
  events: NotificationEvent[];
}

/**
 * Hydration migration: normalize persisted integration incidents against current health.
 * Silent — never emits native notifications.
 */
export function hydrateIntegrationProblemNotifications(
  health?: IntegrationHealthMap,
): HydrateIntegrationProblemsResult {
  const current = listNotificationEvents();
  const { events, changed } = normalizeIntegrationProblemEvents(current, health);
  if (changed) {
    replaceNotificationEvents(events);
  }
  return { changed, events };
}
