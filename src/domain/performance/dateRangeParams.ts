import type { DateRangeKey } from "../performance";
import { presetToBounds } from "./performanceDateRange";

import { appNow } from "../../platform/appClock";
/** Preset bounds as report params; shares the canonical reporting-calendar builder. */
export function dateRangeKeyToBounds(
  key: DateRangeKey,
  now = appNow(),
): { dateFrom: string; dateTo: string } {
  const { from, to } = presetToBounds(key, now);
  return { dateFrom: from, dateTo: to };
}
