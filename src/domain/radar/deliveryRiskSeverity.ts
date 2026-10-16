/**
 * Delivery Risk severity — explicit, auditable rules.
 *
 * Delivery Risk answers "might this task miss its outcome?". It is driven by the CURRENT Task
 * Health of an open, attention-eligible task, never by the owner's calendar alone. Severity:
 *
 *   CRITICAL
 *     C1  Blocked / on hold for >= `blockedCriticalDays` weekdays (default = no-activity rule, 7)
 *     C2  Current stage older than 2x its (stage/profile-specific) target
 *     C3  Rework returned 3+ times in the open cycle and still not resubmitted
 *   WARNING
 *     W1  Blocked / on hold for fewer than `blockedCriticalDays` weekdays
 *     W2  Current stage older than its target (1x..2x)
 *     W3  Repeated rework: 2 returns in the open cycle and still not resubmitted
 *     W4  Returned for rework once and not yet resubmitted
 *     W5  No Jira activity for `noActivityDays`+ while within target
 *     W6  An active dependency blocker (applied by the caller)
 *   INFO
 *     I1  Current stage reached its attention age but is still within target
 *   (no item)  healthy tasks, completed tasks, resolved rework, historical rework
 *
 * Owner leave (applied by `applyOwnerLeaveEscalation`) never creates a risk and never makes a
 * healthy task Critical: leave starting soon lifts Info -> Warning, and leave starting tomorrow
 * additionally lifts an independent Warning -> Critical.
 */
import type { TaskHealthReasonCode, TaskHealthResult } from '../task-health/taskHealthEngine';
import type { RadarSeverity } from './types';

export interface DeliveryRiskAssessment {
  severity: RadarSeverity;
  reasonCode: TaskHealthReasonCode;
  /** Short rule id, e.g. "C2" — surfaced in diagnostics and tests. */
  rule: 'C1' | 'C2' | 'C3' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'I1';
}

export interface DeliveryRiskThresholds {
  /** Weekdays blocked/on hold before the risk becomes Critical. */
  blockedCriticalDays: number;
}

export const DEFAULT_DELIVERY_RISK_THRESHOLDS: DeliveryRiskThresholds = {
  blockedCriticalDays: 7,
};

export function assessDeliveryRiskSeverity(
  health: TaskHealthResult,
  thresholds: DeliveryRiskThresholds = DEFAULT_DELIVERY_RISK_THRESHOLDS,
): DeliveryRiskAssessment | null {
  if (health.isCompleted) return null;
  const ageDays = health.currentStageAgeDays;
  const target = health.stageTarget;

  switch (health.reasonCode) {
    case 'blocked':
      return ageDays !== null && ageDays >= thresholds.blockedCriticalDays
        ? { severity: 'critical', reasonCode: 'blocked', rule: 'C1' }
        : { severity: 'warning', reasonCode: 'blocked', rule: 'W1' };
    case 'stage_overdue':
      return target && ageDays !== null && ageDays > target.criticalDays
        ? { severity: 'critical', reasonCode: 'stage_overdue', rule: 'C2' }
        : { severity: 'warning', reasonCode: 'stage_overdue', rule: 'W2' };
    case 'repeated_rework':
      return health.openCycleReworkEvents >= 3
        ? { severity: 'critical', reasonCode: 'repeated_rework', rule: 'C3' }
        : { severity: 'warning', reasonCode: 'repeated_rework', rule: 'W3' };
    case 'unresolved_rework':
      return { severity: 'warning', reasonCode: 'unresolved_rework', rule: 'W4' };
    case 'no_activity':
      return { severity: 'warning', reasonCode: 'no_activity', rule: 'W5' };
    case 'stage_attention':
      return { severity: 'info', reasonCode: 'stage_attention', rule: 'I1' };
    default:
      return null;
  }
}

export type OwnerLeaveWindow = 'none' | 'soon' | 'tomorrow';

/** Bounded owner-leave escalation: at most one level, never from nothing, never for healthy work. */
export function applyOwnerLeaveEscalation(
  severity: RadarSeverity,
  window: OwnerLeaveWindow,
): RadarSeverity {
  if (window === 'none') return severity;
  if (severity === 'info') return 'warning';
  if (severity === 'warning' && window === 'tomorrow') return 'critical';
  return severity;
}
