import { getLocalDateKey } from "../periods/dateRange";
import { getCurrentWeekRange } from "../periods/dateRange";
import type { DigestKind, DigestRoleVariant } from "./digestTypes";

export function getLocalWeekKey(now = new Date()): string {
  const { start } = getCurrentWeekRange(now);
  return getLocalDateKey(start);
}

export function buildDigestId(
  kind: DigestKind,
  role: DigestRoleVariant,
  now = new Date(),
): string {
  if (kind === "daily") {
    return `daily:${getLocalDateKey(now)}:${role}`;
  }
  return `weekly:${getLocalWeekKey(now)}:${role}`;
}
