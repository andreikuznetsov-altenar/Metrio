import type { UpcomingMeetingsModel } from "../domain/calendar/calendarTypes";

const TTL_MS = 20 * 60 * 1000;
const SESSION_KEY = "metrio-calendar-cache-v1";

interface CacheEntry {
  model: UpcomingMeetingsModel;
  expiresAt: number;
}

let memory: CacheEntry | null = null;

export function readCalendarCache(now = Date.now()): UpcomingMeetingsModel | null {
  if (memory && memory.expiresAt > now) {
    return memory.model;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (parsed.expiresAt <= now) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    memory = parsed;
    return parsed.model;
  } catch {
    return null;
  }
}

export function writeCalendarCache(model: UpcomingMeetingsModel, now = Date.now()): void {
  const entry: CacheEntry = { model, expiresAt: now + TTL_MS };
  memory = entry;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota */
  }
}

export function clearCalendarCache(): void {
  memory = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
