import type { BambooGoal, BambooGoalStatusFilter } from "../../domain/goals/bambooGoalTypes";

export const BAMBOO_GOALS_LIST_TTL_MS = 15 * 60 * 1000;

export type BambooGoalsCacheState =
  | "ready"
  | "forbidden"
  | "error";

export interface BambooGoalsCacheEntry {
  employeeId: string;
  filter: BambooGoalStatusFilter;
  goals: BambooGoal[];
  fetchedAt: number;
  state: BambooGoalsCacheState;
  errorMessage?: string;
}

const cache = new Map<string, BambooGoalsCacheEntry>();

export function bambooGoalsCacheKey(
  employeeId: string,
  filter: BambooGoalStatusFilter,
): string {
  return `${String(employeeId).trim()}::${filter}`;
}

export function getBambooGoalsCacheEntry(
  employeeId: string,
  filter: BambooGoalStatusFilter,
): BambooGoalsCacheEntry | null {
  return cache.get(bambooGoalsCacheKey(employeeId, filter)) ?? null;
}

export function isBambooGoalsCacheFresh(
  entry: BambooGoalsCacheEntry | null,
  now = Date.now(),
  ttlMs = BAMBOO_GOALS_LIST_TTL_MS,
): boolean {
  if (!entry) return false;
  return now - entry.fetchedAt < ttlMs;
}

export function setBambooGoalsCacheEntry(entry: BambooGoalsCacheEntry): void {
  cache.set(bambooGoalsCacheKey(entry.employeeId, entry.filter), entry);
}

/** Invalidate all filters for an employee after a successful write. */
export function invalidateBambooGoalsCache(employeeId: string): void {
  const prefix = `${String(employeeId).trim()}::`;
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function clearBambooGoalsCache(): void {
  cache.clear();
}

/** Test helper: count distinct employees with any cached goal list. */
export function bambooGoalsCachedEmployeeCount(): number {
  const ids = new Set<string>();
  for (const entry of cache.values()) ids.add(entry.employeeId);
  return ids.size;
}
