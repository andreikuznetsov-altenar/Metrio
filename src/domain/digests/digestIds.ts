import { getLocalDateKey } from "../periods/dateRange";
import { getCurrentWeekRange } from "../periods/dateRange";
import type { DigestKind, DigestRoleVariant } from "./digestTypes";

import { appNow } from "../../platform/appClock";
export function getLocalWeekKey(now = appNow()): string {
  const { start } = getCurrentWeekRange(now);
  return getLocalDateKey(start);
}

export function buildDigestId(
  kind: DigestKind,
  role: DigestRoleVariant,
  now = appNow(),
): string {
  if (kind === "daily") {
    return `daily:${getLocalDateKey(now)}:${role}`;
  }
  return `weekly:${getLocalWeekKey(now)}:${role}`;
}
