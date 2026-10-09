import type { AppPreferences } from "./preferences";
import type { NotificationEvent, NotificationEventType } from "./notificationTypes";
import { resolveDisplayTimezone } from "./displayTimezone";

/** Types that upsert message fields while preserving the first createdAt. */
export const DEDUPE_UPSERT_TYPES: NotificationEventType[] = [
  "integration_problem",
  "feedback_action",
  "bamboo_document_action",
  "bamboo_onboarding_action",
];

/** Types that must never stack multiple active inbox cards for the same dedupeKey. */
export const DEDUPE_ACTIVE_SINGLETON_TYPES: NotificationEventType[] = [
  "workload_change",
  "vacation_upcoming",
  "vacation_reminder",
  "vacation_return",
  "availability_change",
  "task_attention",
  "jira_assignment",
  "jira_reassignment",
  "goal_review_due",
  "feedback_requested",
  "feedback_cycle_due",
  "onboarding_step_due",
  "onboarding_feedback_due",
  "daily_brief_ready",
  "weekly_digest_ready",
  ...DEDUPE_UPSERT_TYPES,
];

export function workloadDedupeKey(personId: string, level: string): string {
  return `workload:${personId}:${level}`;
}

export function localNotificationCalendarDay(
  prefs: AppPreferences,
  at = new Date(),
): string {
  const tz = resolveDisplayTimezone(prefs.appearance.displayTimezone);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function isWorkloadNotificationSuppressedToday(
  personId: string,
  prefs: AppPreferences,
  at = new Date(),
): boolean {
  const key = String(personId).trim();
  if (!key) return false;
  const today = localNotificationCalendarDay(prefs, at);
  return prefs.notificationState.workloadNotificationLocalDay?.[key] === today;
}

export function findActiveNotificationByDedupeKey(
  events: NotificationEvent[],
  dedupeKey: string,
): NotificationEvent | undefined {
  return events.find(
    (event) => event.dedupeKey === dedupeKey && !event.resolvedAt && !event.deletedAt,
  );
}

function usesActiveSingletonDedupe(type: NotificationEventType): boolean {
  return DEDUPE_ACTIVE_SINGLETON_TYPES.includes(type);
}

function pickActiveDedupeSurvivor(candidates: NotificationEvent[]): NotificationEvent {
  const sorted = [...candidates].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  return sorted[0]!;
}

/**
 * Collapse duplicate active inbox rows that share a semantic dedupeKey.
 * Preserves earliest createdAt; does not force unread on survivors.
 */
export function collapseSemanticNotificationDuplicates(
  events: NotificationEvent[],
): NotificationEvent[] {
  const passthrough: NotificationEvent[] = [];
  const groups = new Map<string, NotificationEvent[]>();

  for (const event of events) {
    const key = event.dedupeKey;
    if (!key || event.resolvedAt || event.deletedAt) {
      passthrough.push(event);
      continue;
    }
    if (!usesActiveSingletonDedupe(event.type)) {
      passthrough.push(event);
      continue;
    }
    const bucket = groups.get(key) ?? [];
    bucket.push(event);
    groups.set(key, bucket);
  }

  const collapsed: NotificationEvent[] = [...passthrough];
  for (const list of groups.values()) {
    collapsed.push(
      list.length === 1 ? list[0]! : pickActiveDedupeSurvivor(list),
    );
  }

  collapsed.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return collapsed;
}

export function shouldUseActiveSingletonDedupe(
  type: NotificationEventType,
  dedupeKey?: string,
): boolean {
  return Boolean(dedupeKey) && usesActiveSingletonDedupe(type);
}
