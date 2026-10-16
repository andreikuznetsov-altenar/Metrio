import type { KpiData } from '../jira/types';

/**
 * LEGACY / PARITY ONLY — the single compatibility boundary for the pre-V2 KPI shape.
 *
 * Google Apps Script's `backflowCount` counted qualifying backward transitions per issue
 * (an event count in WSkins, an affected-cycle count in UX). Metrics Methodology V2 splits that
 * into `reworkedCycleCount` and `backflowEventCount`, and removed the uncalibrated
 * `efficiencyIndex`. Production code must never read these two legacy fields; only the parity
 * harness and audit scripts may, through this type.
 */
export interface LegacyKpiData
  extends Omit<KpiData, 'reworkedCycleCount' | 'backflowEventCount'> {
  /** Legacy ambiguous counter. Do not use outside legacy/parity code. */
  backflowCount: number;
  /** Legacy uncalibrated 0–100 UX/WSkins score. */
  efficiencyIndex: number;
  reworkedCycleCount?: number;
  backflowEventCount?: number;
}

export type LegacyKpiView = Omit<LegacyKpiData, 'efficiencyIndex'> & {
  /** `null` when the KPI came from the V2 production path, which has no Efficiency Index. */
  efficiencyIndex: number | null;
};

/**
 * Projects a KPI onto the legacy field names so parity rows can compare like for like.
 * For a V2 `KpiData` the legacy `backflowCount` is reported as `reworkedCycleCount` (the UX
 * affected-cycle meaning) and `efficiencyIndex` is `null`.
 */
export function toLegacyKpiView(kpi: KpiData | LegacyKpiData): LegacyKpiView {
  if ('backflowCount' in kpi) return kpi;
  return { ...kpi, backflowCount: kpi.reworkedCycleCount, efficiencyIndex: null };
}
