import type { NotificationEvent } from "./notificationTypes";

export type IntegrationProblemSource = "jira" | "bamboo";
export type IntegrationHealthState = "healthy" | "unhealthy";

export function integrationProblemDedupeKey(
  source: IntegrationProblemSource,
): string {
  return `integration_problem:${source}`;
}

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

const SOURCES: IntegrationProblemSource[] = ["jira", "bamboo"];

function integrationLabel(source: IntegrationProblemSource): string {
  return source === "jira" ? "Jira" : "BambooHR";
}

export function defaultIntegrationProblemCopy(source: IntegrationProblemSource): {
  title: string;
  message: string;
} {
  const label = integrationLabel(source);
  return {
    title: `${label} connection problem`,
    message: `${label} data could not be refreshed. Check Connections in Settings.`,
  };
}

/** Match canonical, legacy, source-tagged, or title-based integration incident cards. */
export function isIntegrationProblemForSource(
  event: NotificationEvent,
  source: IntegrationProblemSource,
): boolean {
  if (event.type !== "integration_problem") return false;
  const keys = allIntegrationProblemDedupeKeys(source);
  if (event.dedupeKey && keys.includes(event.dedupeKey)) return true;
  if (event.source === source) return true;

  const title = (event.title ?? "").toLowerCase();
  if (source === "jira") {
    return title.includes("jira") && title.includes("connection");
  }
  return title.includes("bamboo") && title.includes("connection");
}

function isRestoredOrResolved(event: NotificationEvent): boolean {
  return Boolean(event.resolvedAt) || Boolean(event.dedupeKey?.endsWith(":restored"));
}

function pickCanonicalSurvivor(
  source: IntegrationProblemSource,
  candidates: NotificationEvent[],
): NotificationEvent | null {
  const active = candidates.filter((event) => !isRestoredOrResolved(event));
  if (active.length === 0) return null;

  const byCreated = [...active].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const earliest = byCreated[0]!;
  const canonicalKey = integrationProblemDedupeKey(source);
  const preferred =
    active.find((event) => event.dedupeKey === canonicalKey) ?? earliest;
  const anyUnread = active.some((event) => !event.readAt);
  const copy = defaultIntegrationProblemCopy(source);

  return {
    ...preferred,
    type: "integration_problem",
    dedupeKey: canonicalKey,
    source,
    title: copy.title,
    message: preferred.message?.trim() ? preferred.message : copy.message,
    createdAt: earliest.createdAt,
    readAt: anyUnread ? undefined : preferred.readAt ?? earliest.readAt,
    resolvedAt: undefined,
    actionRequired: true,
    target: preferred.target ?? { kind: "settings", section: "connections" },
  };
}

export interface IntegrationHealthMap {
  jira?: IntegrationHealthState;
  bamboo?: IntegrationHealthState;
}

export interface NormalizeIntegrationProblemsResult {
  events: NotificationEvent[];
  changed: boolean;
}

/**
 * Pure hydration normalize:
 * - drop restored/resolved integration cards
 * - collapse duplicates to one canonical card per source (or zero when healthy)
 * - leave unrelated notifications untouched
 */
export function normalizeIntegrationProblemEvents(
  events: NotificationEvent[],
  health?: IntegrationHealthMap,
): NormalizeIntegrationProblemsResult {
  const unrelated = events.filter(
    (event) =>
      !SOURCES.some((source) => isIntegrationProblemForSource(event, source)),
  );

  const next: NotificationEvent[] = [...unrelated];

  for (const source of SOURCES) {
    const matched = events.filter((event) =>
      isIntegrationProblemForSource(event, source),
    );
    if (matched.length === 0) continue;

    const healthState = health?.[source];
    if (healthState === "healthy") {
      // Current health wins — delete all persisted incidents for this source.
      continue;
    }

    const survivor = pickCanonicalSurvivor(source, matched);
    if (survivor) {
      next.push(survivor);
    }
  }

  // Preserve newest-first ordering used by the store.
  next.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const changed =
    next.length !== events.length ||
    next.some((event, index) => {
      const prev = events[index];
      if (!prev) return true;
      return (
        prev.id !== event.id ||
        prev.dedupeKey !== event.dedupeKey ||
        prev.createdAt !== event.createdAt ||
        prev.readAt !== event.readAt ||
        prev.resolvedAt !== event.resolvedAt ||
        prev.title !== event.title ||
        prev.message !== event.message ||
        prev.source !== event.source
      );
    });

  return { events: next, changed };
}

/** Collapse duplicates only (no health). Safe to run on every persistence write. */
export function collapseIntegrationProblemDuplicates(
  events: NotificationEvent[],
): NotificationEvent[] {
  return normalizeIntegrationProblemEvents(events).events;
}
