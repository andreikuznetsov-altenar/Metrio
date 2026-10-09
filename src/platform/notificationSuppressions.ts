const STORAGE_KEY = "metrio-notification-suppressions";

export interface NotificationSuppression {
  dedupeKey: string;
  deletedAt: string;
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

function writeSuppressions(rows: NotificationSuppression[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function recordNotificationSuppression(
  dedupeKey: string,
  deletedAt?: string,
): void {
  const key = String(dedupeKey).trim();
  if (!key) return;
  const at = deletedAt ?? new Date().toISOString();
  const others = readSuppressions().filter((row) => row.dedupeKey !== key);
  writeSuppressions([...others, { dedupeKey: key, deletedAt: at }]);
}

export function listNotificationSuppressions(): NotificationSuppression[] {
  return readSuppressions();
}

export function clearNotificationSuppressionsForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
