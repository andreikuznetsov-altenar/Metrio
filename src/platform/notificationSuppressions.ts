/**
 * Persistent dismissal ledger ("tombstones") for deleted notifications.
 *
 * The identity is the canonical semantic notification key (`dedupeKey`), the very same key the
 * dedupe/upsert logic uses — one identity shared by dedupe, persistence and dismissal.
 *
 * Scope:
 *  - `event`: the key already names one concrete event (assignment time, run period, milestone,
 *    vacation dates …). The tombstone is permanent (bounded by retention); a different event has a
 *    different key and still appears.
 *  - `episode`: the key names a live/state-derived condition (integration outage, "high workload",
 *    "task problematic"). The tombstone lasts only while that condition lasts and is ended by
 *    `endNotificationEpisode` when the source reports the condition cleared, so a genuinely new
 *    occurrence later is not hidden forever.
 */
const STORAGE_KEY = "metrio-notification-suppressions";

/** Retention: dismissals are small; keep a year and at most this many, newest first. */
export const SUPPRESSION_RETENTION_DAYS = 400;
export const SUPPRESSION_MAX_ENTRIES = 2000;

export type DismissalScope = "event" | "episode";

export interface NotificationSuppression {
  dedupeKey: string;
  deletedAt: string;
  /** Missing on rows written by older builds: treated as `event`. */
  scope?: DismissalScope;
}

export class NotificationDismissalPersistenceError extends Error {
  constructor(cause?: unknown) {
    super("Couldn't save the notification dismissal");
    this.name = "NotificationDismissalPersistenceError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

function readSuppressions(): NotificationSuppression[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => row as NotificationSuppression)
      .filter(
        (row) =>
          typeof row.dedupeKey === "string" &&
          row.dedupeKey.trim() &&
          typeof row.deletedAt === "string",
      );
  } catch {
    return [];
  }
}

/** Drops dismissals older than the retention window, then caps the list (newest kept). */
export function pruneSuppressions(
  rows: NotificationSuppression[],
  now = Date.now(),
): NotificationSuppression[] {
  const cutoff = now - SUPPRESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return rows
    .filter((row) => {
      const at = Date.parse(row.deletedAt);
      return Number.isNaN(at) || at >= cutoff;
    })
    .sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt))
    .slice(0, SUPPRESSION_MAX_ENTRIES);
}

function writeSuppressions(rows: NotificationSuppression[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruneSuppressions(rows)));
}

/** True when this semantic event was dismissed by the user and must not be recreated by a sync. */
export function isNotificationDismissed(dedupeKey: string | undefined | null): boolean {
  const key = String(dedupeKey ?? "").trim();
  if (!key) return false;
  return readSuppressions().some((row) => row.dedupeKey === key);
}

/**
 * Persists the dismissal. Throws `NotificationDismissalPersistenceError` when it cannot be stored,
 * so callers never claim a permanent deletion that did not happen.
 */
export function recordNotificationSuppression(
  dedupeKey: string,
  deletedAt?: string,
  scope: DismissalScope = "event",
): void {
  const key = String(dedupeKey).trim();
  if (!key) return;
  const at = deletedAt ?? new Date().toISOString();
  try {
    const others = readSuppressions().filter((row) => row.dedupeKey !== key);
    writeSuppressions([...others, { dedupeKey: key, deletedAt: at, scope }]);
  } catch (error) {
    throw new NotificationDismissalPersistenceError(error);
  }
}

/** Several dismissals in one write (bulk "clear all"). */
export function recordNotificationSuppressions(
  items: { dedupeKey: string; scope: DismissalScope }[],
  deletedAt?: string,
): void {
  const at = deletedAt ?? new Date().toISOString();
  const keys = new Map<string, DismissalScope>();
  for (const item of items) {
    const key = String(item.dedupeKey ?? "").trim();
    if (key) keys.set(key, item.scope);
  }
  if (keys.size === 0) return;
  try {
    const others = readSuppressions().filter((row) => !keys.has(row.dedupeKey));
    writeSuppressions([
      ...others,
      ...[...keys].map(([dedupeKey, scope]) => ({ dedupeKey, deletedAt: at, scope })),
    ]);
  } catch (error) {
    throw new NotificationDismissalPersistenceError(error);
  }
}

/**
 * The live/state condition behind these keys has ended: forget `episode` tombstones so a genuinely
 * new occurrence is notified again. `event` tombstones are never ended here.
 */
export function endNotificationEpisode(keys: string | string[]): void {
  const drop = new Set((Array.isArray(keys) ? keys : [keys]).map((key) => String(key).trim()));
  const rows = readSuppressions();
  const next = rows.filter((row) => !(row.scope === "episode" && drop.has(row.dedupeKey)));
  if (next.length === rows.length) return;
  try {
    writeSuppressions(next);
  } catch {
    // ending an episode is best-effort; the tombstone is simply kept
  }
}

export function listNotificationSuppressions(): NotificationSuppression[] {
  return readSuppressions();
}

export function clearNotificationSuppressionsForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
