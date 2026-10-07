import type { TrayActionSnapshot } from "./trayActionSnapshot";
import type { TraySummaryModel } from "./buildTraySummaryModel";

export function buildTrayActionSnapshot(summary: TraySummaryModel): TrayActionSnapshot {
  return {
    trayTitle: summary.trayTitle,
    summary,
  };
}
