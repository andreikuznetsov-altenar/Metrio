import { formatDuration } from '../jira/dates';
import type { AuditIssue, ReportParams } from '../jira/types';
import {
  classifyTaskHealth,
  getCurrentStageAgeMs,
  type TaskHealthResult,
} from '../task-health/taskHealthEngine';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';
import { taskHealthThresholdsFromRules } from '../operationalRules/normalizeOperationalRules';
import type { OperationalRules } from '../operationalRules/operationalRulesTypes';
import type { Person } from '../people/types';
import { getOperationalIssues } from '../people/ownedIssues';
import type { RadarSeverity } from './types';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function stageAgeDays(issue: AuditIssue, now: Date): number | null {
  const ms = getCurrentStageAgeMs(issue, now);
  if (ms === null) return null;
  return Math.floor(ms / MS_PER_DAY);
}

export function formatStageAgeLabel(issue: AuditIssue, now: Date): string {
  const days = stageAgeDays(issue, now);
  if (days === null) return '—';
  if (days === 0) return '<1 day';
  return `${days} day${days === 1 ? '' : 's'}`;
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

export function classifyIssueAttention(
  issue: AuditIssue,
  params: ReportParams,
  now = new Date(),
  rules: OperationalRules = DEFAULT_OPERATIONAL_RULES,
): { severity: RadarSeverity; reason: string; health: TaskHealthResult } | null {
  const thresholds = taskHealthThresholdsFromRules(rules);
  const health = classifyTaskHealth({ issue, params, now, thresholds });
  if (health.isCompleted) return null;

  const status = issue.currentStatus || '';
  const workflowStage = resolveWorkflowStage(resolveWorkflowProfile(issue), status);
  if (!workflowStage.countsAsAttentionEligible) return null;
  const stageDays = stageAgeDays(issue, now);
  const reviewDays = rules.taskAttention.reviewAttentionDays;
  const inProgressDays =
    rules.taskAttention.reviewAttentionDays +
    rules.taskAttention.inProgressGraceDays;

  if (health.status === 'problematic' || health.status === 'no_activity') {
    const reason = health.reasons[0] || 'Needs attention';
    return { severity: 'critical', reason, health };
  }

  if (workflowStage.countsAsHold) {
    return { severity: 'critical', reason: 'Blocked or on hold', health };
  }

  if (health.backflowCount >= 2) {
    return {
      severity: 'warning',
      reason: `Review → In Progress ×${health.backflowCount}`,
      health,
    };
  }

  if (health.backflowCount === 1) {
    return { severity: 'warning', reason: 'Returned from Review', health };
  }

  if (stageDays !== null && workflowStage.countsAsReview && stageDays >= reviewDays) {
    return {
      severity: 'warning',
      reason: `Review for ${stageDays} day${stageDays === 1 ? '' : 's'}`,
      health,
    };
  }

  if (stageDays !== null && workflowStage.countsAsActiveWork && stageDays >= inProgressDays) {
    return {
      severity: 'warning',
      reason: `In Progress for ${stageDays} days`,
      health,
    };
  }

  if (health.status === 'at_risk') {
    return { severity: 'warning', reason: health.reasons[0] || 'At risk', health };
  }

  if (
    stageDays !== null &&
    stageDays >= rules.taskAttention.stageAgeAttentionDays
  ) {
    return {
      severity: 'warning',
      reason: `No activity for ${stageDays} days`,
      health,
    };
  }

  return null;
}

/** Badge label for attention tables — never use raw task health "stable" for actionable signals. */
export function attentionPresentationSignalLabel(attention: {
  reason: string;
  health: TaskHealthResult;
}): string {
  const reason = attention.reason.trim();
  const lower = reason.toLowerCase();

  if (attention.health.status === "no_activity" || lower.includes("no activity")) {
    return "No activity";
  }
  if (attention.health.status === "problematic") {
    return "Problematic";
  }
  if (lower.includes("blocked") || lower.includes("on hold")) {
    return "Blocked";
  }
  if (/^review for /i.test(reason)) {
    return "Long Review";
  }
  if (lower.includes("returned from review") || lower.includes("review → in progress")) {
    return "Rework";
  }
  if (lower.includes("backflow")) {
    return "Rework";
  }
  if (attention.health.status === "at_risk") {
    return "At risk";
  }
  if (lower.includes("in progress for")) {
    return "Stale progress";
  }
  return "Needs attention";
}

export function vacationRiskSeverity(
  person: Person,
  atRiskCount: number,
  problematicCount: number,
): RadarSeverity | null {
  const state = person.availability.state;
  if (state !== 'vacation_soon' && state !== 'vacation_tomorrow') return null;
  if (problematicCount > 0 || atRiskCount > 0) return 'critical';
  return 'info';
}

export function vacationDaysLabel(person: Person): string | null {
  if (person.availability.state === 'vacation_tomorrow') return 'Vacation starts tomorrow';
  if (person.availability.state === 'vacation_soon') {
    if (person.availability.startDate) {
      return `Vacation starts ${person.availability.startDate}`;
    }
    return 'Vacation starting soon';
  }
  return null;
}

export function formatCycleMs(ms: number | null | undefined): string {
  if (!ms) return '—';
  return formatDuration(ms);
}
