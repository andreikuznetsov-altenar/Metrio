import type { AuditIssue, ReportParams } from '../jira/types';
import {
  classifyTaskHealth,
  getCurrentStageAgeMs,
  type TaskHealthResult,
} from '../task-health/taskHealthEngine';
import {
  applyOwnerLeaveEscalation,
  assessDeliveryRiskSeverity,
  type DeliveryRiskAssessment,
} from './deliveryRiskSeverity';
import type { TaskHealthReasonCode } from '../task-health/taskHealthEngine';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';
import { taskHealthThresholdsFromRules } from '../operationalRules/normalizeOperationalRules';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import type { Person } from '../people/types';
import { getOperationalIssues } from '../people/ownedIssues';
import type { RadarSeverity } from './types';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';

import { formatWeekdayCount, formatWeekdayDuration } from '../jira/dates';
import { formatLeaveCountdown } from '../availability/leaveCalendar';
import { appNow } from "../../platform/appClock";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function stageAgeDays(issue: AuditIssue, now: Date): number | null {
  const ms = getCurrentStageAgeMs(issue, now);
  if (ms === null) return null;
  return Math.floor(ms / MS_PER_DAY);
}

export function formatStageAgeLabel(issue: AuditIssue, now: Date): string {
  const days = stageAgeDays(issue, now);
  if (days === null) return '—';
  return formatWeekdayCount(days);
}

export function getActiveIssues(person: Person, params?: ReportParams): AuditIssue[] {
  return getOperationalIssues(person).filter((issue) => {
    if (!issue.currentStatus?.trim()) return false;
    const stage = resolveWorkflowStage(
      resolveWorkflowProfile(issue),
      issue.currentStatus,
    );
    if (stage.isTerminal || stage.isCompletion) return false;
    void params;
    return stage.countsAsActiveWork;
  });
}

export interface IssueAttention {
  severity: RadarSeverity;
  reason: string;
  reasonCode: TaskHealthReasonCode;
  /** Delivery Risk rule id (C1..C3, W1..W5, I1) — see deliveryRiskSeverity.ts. */
  rule: DeliveryRiskAssessment['rule'];
  health: TaskHealthResult;
}

function wholeDays(days: number | null): number {
  return days === null ? 0 : Math.floor(days);
}

function attentionReason(
  health: TaskHealthResult,
  assessment: DeliveryRiskAssessment,
  noActivityDays: number,
): string {
  const base = attentionReasonBase(health, assessment);
  const staleNote =
    health.isStale && assessment.reasonCode !== 'no_activity' && assessment.reasonCode !== 'blocked'
      ? `; no activity for ${noActivityDays}+ calendar days`
      : '';
  return `${base}${staleNote}`;
}

function attentionReasonBase(
  health: TaskHealthResult,
  assessment: DeliveryRiskAssessment,
): string {
  const days = wholeDays(health.currentStageAgeDays);
  const dayLabel = formatWeekdayCount(days);
  const targetNote = health.stageTarget
    ? ` (target ${health.stageTarget.targetDays})`
    : '';
  switch (assessment.reasonCode) {
    case 'blocked':
      return health.currentStageAgeDays === null
        ? 'Blocked or on hold'
        : `Blocked or on hold for ${dayLabel}`;
    case 'stage_overdue':
    case 'stage_attention':
      if (health.stageKind === 'review') return `Review for ${dayLabel}${targetNote}`;
      if (health.stageKind === 'qa') return `QA for ${dayLabel}${targetNote}`;
      return `In Progress for ${dayLabel}${targetNote}`;
    case 'repeated_rework':
      return `Review → In Progress ×${health.openCycleReworkEvents}, not resubmitted`;
    case 'unresolved_rework':
      return 'Returned from Review, not resubmitted';
    default:
      return health.reasons[0] || 'Needs attention';
  }
}

/**
 * Open-task attention for Delivery Risk. Severity comes from explicit rules
 * (`assessDeliveryRiskSeverity`) over current Task Health; historical rework that has been
 * resubmitted produces no signal.
 */
export function classifyIssueAttention(
  issue: AuditIssue,
  params: ReportParams,
  now = appNow(),
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): IssueAttention | null {
  const thresholds = taskHealthThresholdsFromRules(rules);
  const health = classifyTaskHealth({ issue, params, now, thresholds });
  if (health.isCompleted) return null;

  const status = issue.currentStatus || '';
  const workflowStage = resolveWorkflowStage(resolveWorkflowProfile(issue), status);
  if (!workflowStage.countsAsAttentionEligible) return null;

  const assessment = assessDeliveryRiskSeverity(health, {
    blockedCriticalDays: rules.taskAttention.noActivityDays,
  });
  if (!assessment) return null;

  return {
    severity: assessment.severity,
    reason: attentionReason(health, assessment, rules.taskAttention.noActivityDays),
    reasonCode: assessment.reasonCode,
    rule: assessment.rule,
    health,
  };
}

/** Badge label for attention tables — never use raw task health "stable" for actionable signals. */
export function attentionPresentationSignalLabel(attention: {
  reason: string;
  health: TaskHealthResult;
  reasonCode?: TaskHealthReasonCode;
}): string {
  const code = attention.reasonCode ?? attention.health.reasonCode;
  switch (code) {
    case 'blocked':
      return 'Blocked';
    case 'no_activity':
      return 'No activity';
    case 'repeated_rework':
    case 'unresolved_rework':
      return 'Rework';
    case 'stage_overdue':
    case 'stage_attention':
      if (attention.health.stageKind === 'review') return 'Long Review';
      if (attention.health.stageKind === 'qa') return 'Long QA';
      return 'Stale progress';
    default:
      break;
  }
  if (attention.health.status === 'problematic') return 'Problematic';
  if (attention.health.status === 'at_risk') return 'At risk';
  return 'Needs attention';
}

/**
 * Person-level leave notice for Team Radar. Leave alone is Info. Open at-risk work lifts it to
 * Warning; open problematic work is Warning, and Critical only when leave starts tomorrow
 * (bounded escalation shared with Delivery Risk).
 */
export function vacationRiskSeverity(
  person: Person,
  atRiskCount: number,
  problematicCount: number,
): RadarSeverity | null {
  const state = person.availability.state;
  if (state !== 'vacation_soon' && state !== 'vacation_tomorrow') return null;
  const window = state === 'vacation_tomorrow' ? 'tomorrow' : 'soon';
  if (problematicCount > 0) return applyOwnerLeaveEscalation('warning', window);
  if (atRiskCount > 0) return applyOwnerLeaveEscalation('info', window);
  return 'info';
}

export function vacationDaysLabel(person: Person): string | null {
  if (person.availability.state === 'vacation_tomorrow') return 'Vacation starts tomorrow';
  if (person.availability.state === 'vacation_soon') {
    if (person.availability.startDate) {
      return `Vacation ${formatLeaveCountdown(person.availability.startDate)}`;
    }
    return 'Vacation starting soon';
  }
  return null;
}

export function formatCycleMs(ms: number | null | undefined): string {
  if (!ms) return '—';
  return formatWeekdayDuration(ms);
}
