import {
  listNotificationEvents,
  recordNotificationEvent,
  removeNotificationEventsByDedupeKeys,
  type NotificationEvent,
} from "./notificationEvents";
import { dispatchNativeNotification } from "./notificationNativeDispatch";

/** Integrations that emit live-state `integration_problem` notifications. */
export type IntegrationProblemSource = "jira" | "bamboo";

export function integrationProblemDedupeKey(
  source: IntegrationProblemSource,
): string {
  return `integration_problem:${source}`;
}

/** Legacy keys from earlier passes (resolve + restored cards). */
export function legacyIntegrationProblemDedupeKeys(
  source: IntegrationProblemSource,
): string[] {
  return [`integration:${source}:unhealthy`, `integration:${source}:restored`];
}

export function allIntegrationProblemDedupeKeys(
  source: IntegrationProblemSource,
): string[] {
  return [
    integrationProblemDedupeKey(source),
    ...legacyIntegrationProblemDedupeKeys(source),
  ];
}

function integrationLabel(source: IntegrationProblemSource): string {
  return source === "jira" ? "Jira" : "BambooHR";
}

function defaultCopy(source: IntegrationProblemSource): {
  title: string;
  message: string;
} {
  const label = integrationLabel(source);
  return {
    title: `${label} connection problem`,
    message: `${label} data could not be refreshed. Check Connections in Settings.`,
  };
}

export function findActiveIntegrationProblem(
  source: IntegrationProblemSource,
): NotificationEvent | undefined {
  const keys = new Set(allIntegrationProblemDedupeKeys(source));
  return listNotificationEvents().find(
    (event) =>
      event.type === "integration_problem" &&
      Boolean(event.dedupeKey) &&
      keys.has(event.dedupeKey!) &&
      !event.resolvedAt &&
      !event.dedupeKey!.endsWith(":restored"),
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
 */
export function setIntegrationProblem(
  input: SetIntegrationProblemInput,
): SetIntegrationProblemResult {
  const { source } = input;
  const copy = defaultCopy(source);
  const dedupeKey = integrationProblemDedupeKey(source);
  const title = input.title ?? copy.title;
  const message = input.message ?? copy.message;
  const existing = findActiveIntegrationProblem(source);

  // Always drop restored leftovers for this source.
  removeNotificationEventsByDedupeKeys([
    `integration:${source}:restored`,
  ]);

  if (existing?.dedupeKey === dedupeKey) {
    const event = recordNotificationEvent({
      type: "integration_problem",
      title,
      message,
      target: { kind: "settings", section: "connections" },
      dedupeKey,
      source,
      actionRequired: true,
    });
    return { event, created: false };
  }

  // Migrate legacy unhealthy key → canonical, preserving incident start + read state.
  if (existing) {
    removeNotificationEventsByDedupeKeys(legacyIntegrationProblemDedupeKeys(source));
    const event = recordNotificationEvent({
      type: "integration_problem",
      title,
      message,
      target: { kind: "settings", section: "connections" },
      dedupeKey,
      source,
      actionRequired: true,
      createdAt: existing.createdAt,
      readAt: existing.readAt,
    });
    return { event, created: false };
  }

  const event = recordNotificationEvent({
    type: "integration_problem",
    title,
    message,
    target: { kind: "settings", section: "connections" },
    dedupeKey,
    source,
    actionRequired: true,
  });

  if (input.emitNative !== false) {
    void dispatchNativeNotification({ title, body: message }).catch(
      () => undefined,
    );
  }

  return { event, created: true };
}

/**
 * Remove the active integration-problem card for this source entirely.
 * No "connection restored" history card.
 */
export function clearIntegrationProblem(source: IntegrationProblemSource): void {
  removeNotificationEventsByDedupeKeys(allIntegrationProblemDedupeKeys(source));
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
